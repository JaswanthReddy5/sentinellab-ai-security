import { classifyDomain } from "./toolAbuse";

export interface DetectionMatch {
  type: string;
  pattern: string;
  snippet: string;
}

const EMAIL_RE = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
const PHONE_RE = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
const CC_RE = /\b(?:\d[ -]*?){13,16}\b/g;
const ADDRESS_RE = /\b\d{1,5}\s+([A-Za-z]+\s){1,3}(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/gi;

function luhnCheck(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function collect(re: RegExp, text: string, type: string, validate?: (raw: string) => boolean): DetectionMatch[] {
  const matches: DetectionMatch[] = [];
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    if (validate && !validate(raw)) continue;
    matches.push({ type, pattern: re.source, snippet: raw.slice(0, 64) });
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return matches;
}

// Catches requests FOR PII (e.g. "list the full names, emails, and phone
// numbers of our customers") even when no literal PII value is present in
// the prompt itself.
const PII_REQUEST_RE =
  /\b(full names?|email address(es)?|phone numbers?|home address(es)?|social security numbers?|dates? of birth|mailing address(es)?)\b[^.?!]{0,60}\b(customers?|users?|clients?|employees?|patients?|members?)\b/i;
const PII_REQUEST_RE_REVERSED =
  /\b(customers?|users?|clients?|employees?|patients?|members?)\b[^.?!]{0,60}\b(full names?|email address(es)?|phone numbers?|home address(es)?|social security numbers?)\b/i;

/**
 * `internalDomains` lets callers exempt ordinary internal business routing
 * addresses (e.g. "send this to john@company.com") from tripping the PII
 * rule — internal and lookalike-domain addresses are left to the dedicated
 * tool/domain policy instead, so a generic `pii: block` rule doesn't fight
 * with a `send_email` tool policy over the exact same recipient address.
 * Genuinely external-domain email addresses are still flagged as PII.
 */
export function detectPII(text: string, internalDomains: string[] = []): DetectionMatch[] {
  const matches: DetectionMatch[] = [];
  const emailMatches = collect(EMAIL_RE, text, "email").filter((m) => {
    const domain = m.snippet.split("@")[1]?.toLowerCase();
    if (!domain) return true;
    const cls = classifyDomain(domain, internalDomains);
    return cls.classification === "external";
  });
  matches.push(...emailMatches);
  matches.push(...collect(PHONE_RE, text, "phone"));
  matches.push(...collect(SSN_RE, text, "ssn"));
  matches.push(
    ...collect(CC_RE, text, "credit_card", (raw) => {
      const digits = raw.replace(/[^0-9]/g, "");
      return digits.length >= 13 && digits.length <= 16 && luhnCheck(digits);
    })
  );
  matches.push(...collect(ADDRESS_RE, text, "address"));

  const reqMatch = text.match(PII_REQUEST_RE) || text.match(PII_REQUEST_RE_REVERSED);
  if (reqMatch) matches.push({ type: "pii_request", pattern: "pii-noun+subject", snippet: reqMatch[0].slice(0, 80) });

  return matches;
}
