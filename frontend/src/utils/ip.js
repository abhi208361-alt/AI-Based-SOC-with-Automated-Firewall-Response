/**
 * IP utility helpers for frontend forms.
 * - Accepts values like:
 *   "127.0.0.1"
 *   "127.0.0.1:5173"
 *   "http://127.0.0.1:5173"
 *   " https://127.0.0.1 "
 * - Returns clean IPv4 string or "".
 */

/**
 * Strip protocol, path, query, and port from user input.
 * Example: "http://127.0.0.1:5173/test?a=1" -> "127.0.0.1"
 */
export function normalizeIp(value) {
  if (!value) return "";

  let v = String(value).trim();

  // Remove protocol if present
  v = v.replace(/^https?:\/\//i, "");

  // Remove path/query/hash if pasted URL
  v = v.split("/")[0].split("?")[0].split("#")[0];

  // Remove port if present (IPv4:port)
  if (v.includes(":")) {
    v = v.split(":")[0];
  }

  return v.trim();
}

/**
 * Validate IPv4 format.
 */
export function isValidIPv4(ip) {
  if (!ip) return false;

  const parts = ip.split(".");
  if (parts.length !== 4) return false;

  for (const p of parts) {
    if (!/^\d+$/.test(p)) return false;
    const n = Number(p);
    if (n < 0 || n > 255) return false;
    // Prevent "01", "001" style if you want strictness:
    if (String(n) !== p && p !== "0") return false;
  }

  return true;
}

/**
 * Normalize + validate in one step.
 */
export function parseIPv4(value) {
  const ip = normalizeIp(value);
  return {
    ip,
    valid: isValidIPv4(ip),
  };
}

/**
 * Helper to build friendly error messages for UI.
 */
export function getIpValidationError(value, fieldName = "IP address") {
  const { ip, valid } = parseIPv4(value);
  if (!ip) return `${fieldName} is required.`;
  if (!valid) return `Enter a valid IPv4 address (example: 127.0.0.1).`;
  return "";
}