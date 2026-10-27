// Drops any key that looks like a credential before data leaves the server.
// Used for saved reports and ARC records proxied to the browser.
const hidden = /apiKey|token|secret|authorization|password/i;

export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !hidden.test(key)).map(([key, item]) => [key, redact(item)]));
}
