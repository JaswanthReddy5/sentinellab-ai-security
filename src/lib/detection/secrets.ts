import type { DetectionMatch } from "./pii";

const PATTERNS: Array<{ type: string; re: RegExp }> = [
  { type: "openai_key", re: /\bsk-[a-zA-Z0-9]{16,}\b/g },
  { type: "aws_access_key", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { type: "github_token", re: /\bgh[pousr]_[a-zA-Z0-9]{20,}\b/g },
  { type: "slack_token", re: /\bxox[baprs]-[a-zA-Z0-9-]{10,}\b/g },
  { type: "generic_api_key_assignment", re: /\b(api[_-]?key|secret[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]\s*["']?[a-zA-Z0-9_\-/.+]{12,}["']?/gi },
  { type: "private_key_block", re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { type: "bearer_token", re: /\bBearer\s+[a-zA-Z0-9._\-]{20,}\b/g },
  { type: "jwt_like", re: /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g },
  // Requests FOR a secret, even when no literal secret value is present.
  { type: "credential_request", re: /\b(what is|print|show|reveal|give me|tell me|output)\b[^.?!]{0,40}\b(api[_ -]?key|password|secret key|private key|access token|client secret|credentials?)\b/gi },
];

export function detectSecrets(text: string): DetectionMatch[] {
  const matches: DetectionMatch[] = [];
  for (const { type, re } of PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      matches.push({ type, pattern: re.source, snippet: m[0].slice(0, 48) });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
  return matches;
}
