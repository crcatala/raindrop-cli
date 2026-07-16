/**
 * Secure token storage using the operating system keyring.
 *
 * keytar uses macOS Keychain, Windows Credential Manager, and Linux Secret
 * Service (libsecret). It is loaded lazily so the explicit config-file
 * fallback remains usable when the native keyring is unavailable.
 */
const SERVICE_NAME = "raindrop-cli";
const ACCOUNT_NAME = "default";

async function getKeytar() {
  try {
    const keytar = await import("keytar");
    return keytar.default;
  } catch {
    throw new Error(
      "Unable to access the system keyring. On Linux, install libsecret and ensure an active Secret Service session, or rerun with --use-config to store the token in the config file."
    );
  }
}

export async function getKeyringToken(): Promise<string | null> {
  const keytar = await getKeytar();
  return keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
}

export async function setKeyringToken(token: string): Promise<void> {
  const keytar = await getKeytar();
  await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, token);
}

export async function clearKeyringToken(): Promise<void> {
  const keytar = await getKeytar();
  await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
}
