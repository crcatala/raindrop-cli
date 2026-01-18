import { describe, it, expect, beforeEach, afterEach, spyOn, mock } from "bun:test";
import { Writable } from "node:stream";
import { handlePipeErrors, setupSignalHandlers, runCliMain, type CliMainArgs } from "./cli-main.js";
import { UsageError, ApiError, ConfigError, TimeoutError } from "./utils/errors.js";

describe("handlePipeErrors", () => {
  it("calls exit(0) on EPIPE", () => {
    let exitCode: number | undefined;
    const stream = new Writable({ write() {} });

    handlePipeErrors(stream, (code) => {
      exitCode = code;
    });

    const epipeError = new Error("write EPIPE") as NodeJS.ErrnoException;
    epipeError.code = "EPIPE";
    stream.emit("error", epipeError);

    expect(exitCode).toBe(0);
  });

  it("re-throws non-EPIPE errors", () => {
    const stream = new Writable({ write() {} });
    handlePipeErrors(stream, () => {});

    const otherError = new Error("other") as NodeJS.ErrnoException;
    otherError.code = "ENOENT";

    expect(() => stream.emit("error", otherError)).toThrow("other");
  });
});

describe("setupSignalHandlers", () => {
  let handlers: Map<string, () => void>;
  let processOnSpy: ReturnType<typeof spyOn>;
  let stderrOutput: string;
  let exitCode: number | undefined;
  let mockStderr: Writable;
  let mockExit: (code: number) => void;

  beforeEach(() => {
    handlers = new Map();
    stderrOutput = "";
    exitCode = undefined;

    // Mock process.on to capture signal handlers
    processOnSpy = spyOn(process, "on").mockImplementation((event: string, handler: () => void) => {
      handlers.set(event, handler);
      return process;
    });

    mockStderr = new Writable({
      write(chunk, _encoding, callback) {
        stderrOutput += chunk.toString();
        callback();
      },
    });

    mockExit = (code: number) => {
      exitCode = code;
    };
  });

  afterEach(() => {
    processOnSpy.mockRestore();
  });

  it("registers SIGINT and SIGTERM handlers", () => {
    setupSignalHandlers(mockStderr, mockExit);

    expect(handlers.has("SIGINT")).toBe(true);
    expect(handlers.has("SIGTERM")).toBe(true);
  });

  it("SIGINT first press shows message and does not exit immediately", () => {
    setupSignalHandlers(mockStderr, mockExit);

    const sigintHandler = handlers.get("SIGINT")!;
    sigintHandler();

    expect(stderrOutput).toContain("Interrupted");
    expect(stderrOutput).toContain("Press Ctrl-C again to force exit");
    // Should not exit immediately
    expect(exitCode).toBeUndefined();
  });

  it("SIGINT second press force exits with code 130", () => {
    setupSignalHandlers(mockStderr, mockExit);

    const sigintHandler = handlers.get("SIGINT")!;
    // First press
    sigintHandler();
    stderrOutput = "";
    // Second press
    sigintHandler();

    expect(stderrOutput).toContain("Force exiting");
    expect(exitCode).toBe(130);
  });

  it("SIGTERM exits with code 143", () => {
    setupSignalHandlers(mockStderr, mockExit);

    const sigtermHandler = handlers.get("SIGTERM")!;
    sigtermHandler();

    expect(stderrOutput).toContain("Terminated");
    expect(exitCode).toBe(143);
  });
});

describe("runCliMain error handling", () => {
  let stderrOutput: string;
  let exitCode: number | undefined;
  let mockStderr: Writable;
  let mockStdout: Writable;
  let runCliMock: ReturnType<typeof mock>;
  let processOnSpy: ReturnType<typeof spyOn>;
  let runCliSpy: ReturnType<typeof spyOn>;

  function createCliArgs(argv: string[]): CliMainArgs {
    return {
      argv,
      env: {},
      stdout: mockStdout,
      stderr: mockStderr,
      exit: () => {},
      setExitCode: (code: number) => {
        exitCode = code;
      },
    };
  }

  beforeEach(async () => {
    stderrOutput = "";
    exitCode = undefined;

    mockStderr = new Writable({
      write(chunk, _encoding, callback) {
        stderrOutput += chunk.toString();
        callback();
      },
    });

    mockStdout = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    });

    // Mock process.on to avoid registering actual signal handlers
    processOnSpy = spyOn(process, "on").mockImplementation(() => process);

    // Mock runCli - we'll set the implementation per test
    runCliMock = mock();
    const runModule = await import("./run.js");
    runCliSpy = spyOn(runModule, "runCli").mockImplementation(runCliMock);
  });

  afterEach(() => {
    processOnSpy.mockRestore();
    runCliSpy.mockRestore();
  });

  describe("exit codes for CliError types", () => {
    it("UsageError exits with code 2", async () => {
      runCliMock.mockRejectedValue(new UsageError("Invalid argument"));
      await runCliMain(createCliArgs(["node", "rd"]));
      expect(exitCode).toBe(2);
    });

    it("ApiError exits with code 1", async () => {
      runCliMock.mockRejectedValue(new ApiError("API failed", 500));
      await runCliMain(createCliArgs(["node", "rd"]));
      expect(exitCode).toBe(1);
    });

    it("ConfigError exits with code 1", async () => {
      runCliMock.mockRejectedValue(new ConfigError("Config invalid"));
      await runCliMain(createCliArgs(["node", "rd"]));
      expect(exitCode).toBe(1);
    });

    it("TimeoutError exits with code 1", async () => {
      runCliMock.mockRejectedValue(new TimeoutError(30));
      await runCliMain(createCliArgs(["node", "rd"]));
      expect(exitCode).toBe(1);
    });

    it("generic Error exits with code 1", async () => {
      runCliMock.mockRejectedValue(new Error("Something went wrong"));
      await runCliMain(createCliArgs(["node", "rd"]));
      expect(exitCode).toBe(1);
    });
  });

  describe("JSON error output", () => {
    it("outputs CliError.toJSON() when --json flag is set", async () => {
      runCliMock.mockRejectedValue(new UsageError("Invalid timeout", { timeout: -5 }));
      await runCliMain(createCliArgs(["node", "rd", "--json"]));

      const output = JSON.parse(stderrOutput);
      expect(output).toEqual({
        error: true,
        code: "USAGE_ERROR",
        message: "Invalid timeout",
        details: { timeout: -5 },
      });
      expect(exitCode).toBe(2);
    });

    it("outputs ApiError.toJSON() with statusCode in details", async () => {
      runCliMock.mockRejectedValue(new ApiError("Not found", 404));
      await runCliMain(createCliArgs(["node", "rd", "--json"]));

      const output = JSON.parse(stderrOutput);
      expect(output.error).toBe(true);
      expect(output.code).toBe("API_ERROR");
      expect(output.message).toBe("Not found");
      expect(output.details.statusCode).toBe(404);
      expect(exitCode).toBe(1);
    });

    it("outputs generic error format for non-CliError with --json", async () => {
      runCliMock.mockRejectedValue(new Error("Unknown error"));
      await runCliMain(createCliArgs(["node", "rd", "--json"]));

      const output = JSON.parse(stderrOutput);
      expect(output).toEqual({ error: "Unknown error" });
      expect(exitCode).toBe(1);
    });
  });
});
