// Minimal structured logger. Never log secrets, credentials, or full
// sensitive user content — only event names and non-sensitive metadata.

type LogFields = Record<string, string | number | boolean | null | undefined>;

const REDACT_KEYS = new Set(["apiKey", "api_key", "token", "password", "secret", "authorization"]);

function safeFields(fields?: LogFields): LogFields {
  if (!fields) return {};
  const out: LogFields = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = REDACT_KEYS.has(k.toLowerCase()) ? "[redacted]" : v;
  }
  return out;
}

function emit(level: "info" | "warn" | "error", event: string, fields?: LogFields) {
  const entry = { level, event, ts: new Date().toISOString(), ...safeFields(fields) };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, fields?: LogFields) => emit("info", event, fields),
  warn: (event: string, fields?: LogFields) => emit("warn", event, fields),
  error: (event: string, fields?: LogFields) => emit("error", event, fields),
};
