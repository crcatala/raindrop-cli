export function formatJson<T>(data: T): string {
  return JSON.stringify(data, null, 2);
}
