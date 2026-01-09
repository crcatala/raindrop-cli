import { test, expect } from "bun:test";
import axios from "axios";

test("axios requests should be blocked by default", async () => {
  try {
    await axios.get("https://example.com");
    throw new Error("Should have failed");
  } catch (error: any) {
    // Nock error message for axios usually comes through as a network error
    // "Nock: Disallowed net connect for ..."
    expect(error.message).toContain("Disallowed net connect");
  }
});
