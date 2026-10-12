/** API endpoints are origins; paths, credentials, queries and fragments are rejected. */
export function validateBaseUrl(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("API URL must be an HTTPS origin or an explicit HTTP loopback origin."); }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("API URL must be an HTTPS origin or an explicit HTTP loopback origin.");
  }
  return url.origin;
}
