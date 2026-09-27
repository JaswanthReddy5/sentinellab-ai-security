# Security Policy

SentinelLab is an independent research/prototype platform. It is **not** a certified or production-grade security product, and its detection engine is heuristic (regex/rule-based), not a formal guarantee.

## Reporting a Vulnerability

If you find a security issue in this repository itself (e.g. a way to inject code via the demo UI, an XSS vector in a report page, or a secret accidentally committed), please open a private security advisory on GitHub rather than a public issue:

`https://github.com/JaswanthReddy5/sentinellab-ai-security/security/advisories/new`

Please include:

- A description of the issue and its impact
- Steps to reproduce
- Any relevant logs or screenshots (redact secrets)

## Scope

In scope: the SentinelLab application code itself (this repository).

Out of scope: the accuracy or completeness of the AI-security detection heuristics — these are explicitly documented as prototype-grade throughout the app (see `/attack-research` and `/settings`), not as a security guarantee subject to a bug bounty.

## Supported Versions

This is a single-branch research prototype. Only the latest commit on `main` is supported.
