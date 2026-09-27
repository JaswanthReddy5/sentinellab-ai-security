import type { DetectionMatch } from "./pii";

const KNOWN_PUBLIC_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "protonmail.com",
  "aol.com",
  "icloud.com",
  "mail.com",
  "gmx.com",
];

export interface DomainClassification {
  domain: string;
  classification: "internal" | "external" | "lookalike";
  matchedInternal?: string;
}

/** Levenshtein distance, small-input only (domain strings). */
function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

export function extractDomains(text: string): string[] {
  const emailRe = /\b[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
  const domains = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = emailRe.exec(text)) !== null) domains.add(m[1].toLowerCase());
  return [...domains];
}

export function classifyDomain(domain: string, internalDomains: string[]): DomainClassification {
  const normalizedInternal = internalDomains.map((d) => d.toLowerCase());
  if (normalizedInternal.includes(domain)) {
    return { domain, classification: "internal" };
  }
  for (const internal of normalizedInternal) {
    const dist = levenshtein(domain, internal);
    if (dist > 0 && dist <= 2) {
      return { domain, classification: "lookalike", matchedInternal: internal };
    }
  }
  return { domain, classification: "external" };
}

export function detectExternalDestination(text: string, internalDomains: string[]): DetectionMatch[] {
  const matches: DetectionMatch[] = [];
  const domains = extractDomains(text);
  for (const domain of domains) {
    const cls = classifyDomain(domain, internalDomains.length ? internalDomains : []);
    const isKnownPublic = KNOWN_PUBLIC_DOMAINS.includes(domain);
    if (cls.classification === "external" || isKnownPublic) {
      matches.push({ type: "external_destination", pattern: "domain-classification", snippet: domain });
    } else if (cls.classification === "lookalike") {
      matches.push({ type: "lookalike_destination", pattern: "domain-edit-distance", snippet: domain });
    }
  }
  // Non-email external destinations: raw URLs, curl/exfil commands.
  const urlRe = /\bhttps?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*/g;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(text)) !== null) {
    matches.push({ type: "external_url", pattern: urlRe.source, snippet: m[0].slice(0, 64) });
  }
  return matches;
}

const EXFIL_VERBS = /\b(send|export|upload|forward|share|copy|transfer|leak|dump|exfiltrate)\b/i;
const SENSITIVE_NOUNS = /\b(customer (database|data|records?|list)|database|credentials?|source code|financial (report|data)|internal (docs?|documents?|files?)|confidential (data|information|files?)|api keys?|secrets?|private keys?|user data|personal (data|information))\b/i;

export function detectDataExfiltration(text: string, internalDomains: string[]): DetectionMatch[] {
  const matches: DetectionMatch[] = [];
  const hasVerb = EXFIL_VERBS.test(text);
  const hasSensitiveNoun = SENSITIVE_NOUNS.test(text);
  const externalMatches = detectExternalDestination(text, internalDomains);

  if (hasVerb && hasSensitiveNoun && externalMatches.some((m) => m.type === "external_destination" || m.type === "external_url")) {
    matches.push({ type: "exfiltration_pattern", pattern: "verb+sensitive-noun+external-destination", snippet: text.slice(0, 80) });
  } else if (hasVerb && hasSensitiveNoun) {
    matches.push({ type: "sensitive_export_request", pattern: "verb+sensitive-noun", snippet: text.slice(0, 80) });
  }
  return matches;
}

const PRIV_ESCALATION_RE = [
  /\bgrant (me|myself) (admin|administrator|root|superuser)\b/i,
  /\belevate (my|the) (privileges?|permissions?|access)\b/i,
  /\bbypass (the )?(approval|authorization|review) (process|step)?\b/i,
  /\bdisable (the )?(security|audit|logging|approval)\b/i,
  /\bact with (admin|root|elevated) (rights|privileges|access)\b/i,
  /\bwithout (requiring|needing) (approval|authorization|sign-?off)\b/i,
];

export function detectPrivilegeEscalation(text: string): DetectionMatch[] {
  const matches: DetectionMatch[] = [];
  for (const re of PRIV_ESCALATION_RE) {
    const m = text.match(re);
    if (m) matches.push({ type: "privilege_escalation", pattern: re.source, snippet: m[0].slice(0, 80) });
  }
  return matches;
}

const EXCESSIVE_AGENCY_RE = [
  /\bwithout (asking|confirming|checking) (first|with anyone)?\b/i,
  /\bdon't (wait for|ask for) (confirmation|approval|permission)\b/i,
  /\bautomatically (approve|execute|process) (all|any|every)\b/i,
  /\btake (full|complete) control (of|over)\b/i,
];

export function detectExcessiveAgency(text: string): DetectionMatch[] {
  const matches: DetectionMatch[] = [];
  for (const re of EXCESSIVE_AGENCY_RE) {
    const m = text.match(re);
    if (m) matches.push({ type: "excessive_agency", pattern: re.source, snippet: m[0].slice(0, 80) });
  }
  return matches;
}

export function detectToolAbuse(text: string, internalDomains: string[]): DetectionMatch[] {
  return [
    ...detectExternalDestination(text, internalDomains).filter((m) => m.type !== "lookalike_destination"),
    ...detectPrivilegeEscalation(text),
    ...detectExcessiveAgency(text),
  ];
}
