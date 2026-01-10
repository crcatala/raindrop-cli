import { describe, it, expect } from "bun:test";
import { Writable } from "node:stream";
import { handlePipeErrors } from "./cli-main.js";

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
