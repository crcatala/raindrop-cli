/**
 * Stream utilities for unit testing CLI output.
 *
 * These utilities enable fast unit tests by allowing runCli() to be called
 * directly with mocked streams instead of spawning subprocesses.
 *
 * Example usage:
 *   const { stream: stdout, getOutput } = captureStream();
 *   await runCli(['--help'], { env: {}, stdout, stderr: noopStream() });
 *   expect(getOutput()).toContain('Commands:');
 */

import { Writable } from "node:stream";

/**
 * Create a stream that captures all written data.
 * Use for testing stdout/stderr output.
 */
export function captureStream(): {
  stream: NodeJS.WritableStream;
  getOutput: () => string;
} {
  let output = "";
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString();
      callback();
    },
  });
  return { stream, getOutput: () => output };
}

/**
 * Create a stream that discards all data.
 * Use when you don't care about the output.
 */
export function noopStream(): NodeJS.WritableStream {
  return new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
}
