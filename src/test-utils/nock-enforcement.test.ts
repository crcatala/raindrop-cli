import { expect, test } from "bun:test";
import nock from "nock";

test("network interception is active by default", () => {
  // Coverage instrumentation can prevent Axios from reaching Nock under Bun,
  // making an HTTP request here hang despite the interceptor being enabled.
  // The preload setup owns the policy; verify its observable active state
  // without performing a real network operation.
  expect(nock.isActive()).toBe(true);
});
