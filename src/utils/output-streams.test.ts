import { describe, test, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { Writable } from "node:stream";
import {
  outputData,
  outputMessage,
  outputError,
  outputDataRaw,
  outputMessageRaw,
  setOutputStream,
  resetOutputStream,
} from "./output-streams.js";

describe("output-streams", () => {
  let stdoutSpy: ReturnType<typeof spyOn>;
  let stderrSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    stdoutSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrSpy = spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  describe("outputData", () => {
    test("writes to stdout with newline", () => {
      outputData("test message");
      expect(stdoutSpy).toHaveBeenCalledWith("test message\n");
    });

    test("does not write to stderr", () => {
      outputData("test message");
      expect(stderrSpy).not.toHaveBeenCalled();
    });
  });

  describe("outputMessage", () => {
    test("writes to stderr with newline", () => {
      outputMessage("info message");
      expect(stderrSpy).toHaveBeenCalledWith("info message\n");
    });

    test("does not write to stdout", () => {
      outputMessage("info message");
      expect(stdoutSpy).not.toHaveBeenCalled();
    });
  });

  describe("outputError", () => {
    test("writes to stderr with newline", () => {
      outputError("error message");
      expect(stderrSpy).toHaveBeenCalledWith("error message\n");
    });

    test("does not write to stdout", () => {
      outputError("error message");
      expect(stdoutSpy).not.toHaveBeenCalled();
    });
  });

  describe("outputDataRaw", () => {
    test("writes to stdout without newline", () => {
      outputDataRaw("raw data");
      expect(stdoutSpy).toHaveBeenCalledWith("raw data");
    });

    test("does not write to stderr", () => {
      outputDataRaw("raw data");
      expect(stderrSpy).not.toHaveBeenCalled();
    });
  });

  describe("outputMessageRaw", () => {
    test("writes to stderr without newline", () => {
      outputMessageRaw("raw message");
      expect(stderrSpy).toHaveBeenCalledWith("raw message");
    });

    test("does not write to stdout", () => {
      outputMessageRaw("raw message");
      expect(stdoutSpy).not.toHaveBeenCalled();
    });
  });

  describe("stream injection", () => {
    // Helper to create a writable stream that captures output
    function createCaptureStream(): {
      stream: NodeJS.WritableStream;
      getOutput: () => string;
    } {
      const chunks: Buffer[] = [];
      const stream = new Writable({
        write(chunk, _encoding, callback) {
          chunks.push(Buffer.from(chunk));
          callback();
        },
      });
      return {
        stream,
        getOutput: () => Buffer.concat(chunks).toString("utf8"),
      };
    }

    afterEach(() => {
      resetOutputStream();
    });

    test("setOutputStream redirects output to custom streams", () => {
      const stdout = createCaptureStream();
      const stderr = createCaptureStream();

      setOutputStream(stdout.stream, stderr.stream);

      outputData("data line");
      outputMessage("message line");
      outputError("error line");

      expect(stdout.getOutput()).toBe("data line\n");
      expect(stderr.getOutput()).toBe("message line\nerror line\n");
    });

    test("resetOutputStream restores default streams", () => {
      const stdout = createCaptureStream();
      const stderr = createCaptureStream();

      setOutputStream(stdout.stream, stderr.stream);
      outputData("captured");

      resetOutputStream();
      outputData("to process.stdout");

      // Only the first message should be in our capture stream
      expect(stdout.getOutput()).toBe("captured\n");
      // Second message went to process.stdout (which is mocked by stdoutSpy)
      expect(stdoutSpy).toHaveBeenCalledWith("to process.stdout\n");
    });
  });
});
