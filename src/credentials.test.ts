import { beforeEach, describe, expect, mock, test } from "bun:test";

const KEYTAR_PATH = "keytar";

describe("credentials", () => {
  beforeEach(() => {
    mock.restore();
  });

  test("reads the default Raindrop token from the system keyring", async () => {
    const getPassword = mock(() => Promise.resolve("token"));
    await mock.module(KEYTAR_PATH, () => ({ default: { getPassword } }));

    const { getKeyringToken } = await import("./credentials.js");
    expect(await getKeyringToken()).toBe("token");
    expect(getPassword).toHaveBeenCalledWith("raindrop-cli", "default");
  });

  test("writes the default Raindrop token to the system keyring", async () => {
    const setPassword = mock(() => Promise.resolve());
    await mock.module(KEYTAR_PATH, () => ({ default: { setPassword } }));

    const { setKeyringToken } = await import("./credentials.js");
    await setKeyringToken("token");
    expect(setPassword).toHaveBeenCalledWith("raindrop-cli", "default", "token");
  });

  test("removes the default Raindrop token from the system keyring", async () => {
    const deletePassword = mock(() => Promise.resolve(true));
    await mock.module(KEYTAR_PATH, () => ({ default: { deletePassword } }));

    const { clearKeyringToken } = await import("./credentials.js");
    await clearKeyringToken();
    expect(deletePassword).toHaveBeenCalledWith("raindrop-cli", "default");
  });

  test("reports a keyring deletion failure", async () => {
    const deletePassword = mock(() => Promise.reject(new Error("unavailable")));
    await mock.module(KEYTAR_PATH, () => ({ default: { deletePassword } }));

    const { clearKeyringToken } = await import("./credentials.js");
    await expect(clearKeyringToken()).rejects.toThrow("unavailable");
    expect(deletePassword).toHaveBeenCalled();
  });
});
