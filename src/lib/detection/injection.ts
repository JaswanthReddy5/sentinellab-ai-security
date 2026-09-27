import type { DetectionMatch } from "./pii";

// Prompt injection / jailbreak / instruction-hierarchy heuristics.
const INJECTION_PHRASES: Array<{ type: string; re: RegExp }> = [
  { type: "instruction_override", re: /\bignore (all|any|the)?\s*(previous|prior|above|earlier)\s*(instructions?|rules?|prompts?)\b/i },
  { type: "instruction_override", re: /\bdisregard (the|your|all)\s*(system prompt|instructions?|guidelines?|rules?)\b/i },
  { type: "instruction_override", re: /\bforget (everything|all instructions|what (i|you) (was|were) told)\b/i },
  { type: "system_prompt_extraction", re: /\b(reveal|show|print|output|repeat)\s+(your|the)\s+(full\s+|complete\s+|entire\s+)?(system prompt|instructions|hidden prompt|initial prompt|configuration)\b/i },
  { type: "system_prompt_extraction", re: /\bwhat (are|were) your (original )?(instructions|system prompt)\b/i },
  { type: "role_manipulation", re: /\byou are now\b/i },
  { type: "role_manipulation", re: /\back as (an?|the)\s+\w+/i },
  { type: "role_manipulation", re: /\bpretend (to be|you are)\b/i },
  { type: "role_manipulation", re: /\bDAN\b|\bdo anything now\b/i },
  { type: "developer_mode", re: /\bdeveloper mode\b/i },
  { type: "hierarchy_manipulation", re: /\b(system|admin|developer)\s*:?\s*override\b/i },
  { type: "hierarchy_manipulation", re: /\bnew instructions? (from|by) (the )?(system|developer|admin)\b/i },
  { type: "hierarchy_manipulation", re: /\bsupersedes (all )?(prior|previous) instructions\b/i },
  { type: "hierarchy_manipulation", re: /\bhighest[\s-]priority\b|\bpriority:\s*highest\b/i },
  { type: "jailbreak_no_restrictions", re: /\bno (restrictions|filters|rules|limitations)\b/i },
  { type: "jailbreak_unrestricted", re: /\bwithout (any )?(ethical |safety )?(guidelines|restrictions|limitations)\b/i },
  { type: "encoded_instruction", re: /\bdecode (this|the following)\b[^.?!]{0,40}\b(execute|follow|run|carry out|comply with|perform)\b/i },
  { type: "step_by_step_bypass", re: /\bstep\s*1[:.][\s\S]{0,200}step\s*2[:.]/i },
];

const INDIRECT_MARKERS: Array<{ type: string; re: RegExp }> = [
  { type: "indirect_document_instruction", re: /\b(the following is|below is|this document contains?)\s+(content|text)?\s*(from|retrieved from)\s+(a webpage|an? (retrieved )?document|a search result|an email)\b/i },
  { type: "indirect_document_instruction", re: /\[?(retrieved|external)[_ -]?(document|content|webpage)\]?\s*:/i },
  { type: "indirect_document_instruction", re: /\bnow follow (any|the) instructions? (in|within|inside) (it|that document|the content)\b/i },
];

export function detectPromptInjection(text: string): DetectionMatch[] {
  const matches: DetectionMatch[] = [];
  for (const { type, re } of INJECTION_PHRASES) {
    const m = text.match(re);
    if (m) matches.push({ type, pattern: re.source, snippet: m[0].slice(0, 80) });
  }
  return matches;
}

export function detectIndirectInjection(text: string): DetectionMatch[] {
  const matches: DetectionMatch[] = [];
  for (const { type, re } of INDIRECT_MARKERS) {
    const m = text.match(re);
    if (m) matches.push({ type, pattern: re.source, snippet: m[0].slice(0, 80) });
  }
  return matches;
}

export function detectUnicodeObfuscation(text: string): DetectionMatch[] {
  const matches: DetectionMatch[] = [];
  // Zero-width / bidi control characters often used to split flagged tokens.
  const zeroWidth = /[​‌‍⁠﻿]/g;
  if (zeroWidth.test(text)) {
    matches.push({ type: "zero_width_obfuscation", pattern: "zero-width-chars", snippet: "[hidden control characters]" });
  }
  // Homoglyph-heavy text: mix of Cyrillic/Latin lookalikes.
  const homoglyphs = /[а-яА-Я]/g; // Cyrillic block used as stand-ins for Latin letters
  if (homoglyphs.test(text)) {
    matches.push({ type: "homoglyph_substitution", pattern: "cyrillic-lookalikes", snippet: "[mixed-script lookalike characters]" });
  }
  return matches;
}

const BASE64_BLOCK_RE = /\b(?:[A-Za-z0-9+/]{24,}={0,2})\b/g;
export function detectEncodedPayload(text: string): DetectionMatch[] {
  const matches: DetectionMatch[] = [];
  let m: RegExpExecArray | null;
  BASE64_BLOCK_RE.lastIndex = 0;
  while ((m = BASE64_BLOCK_RE.exec(text)) !== null) {
    matches.push({ type: "base64_like_payload", pattern: BASE64_BLOCK_RE.source, snippet: m[0].slice(0, 48) });
  }
  return matches;
}
