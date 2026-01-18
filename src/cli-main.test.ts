import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { Writable } from "node:stream";
import { handlePipeErrors, setupSignalHandlers } from "./cli-main.js";

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
