# Contributing to SentinelLab

Thanks for your interest — this is a research/portfolio prototype, but contributions that improve the engineering quality or the AI-security methodology are welcome.

## Local setup

```bash
npm install
npm run dev
```

No environment variables are required — the app runs fully in deterministic demo mode.

## Before opening a PR

```bash
npm run lint
npm run test
npm run build
```

All three must pass. New engine logic (detectors, mutation techniques, regression/diff calculations) should ship with unit tests in `src/lib/__tests__/`.

## Code style

- TypeScript strict mode; no `any` unless genuinely unavoidable.
- Deterministic by default — anything that generates test data or mutations must be seedable and reproducible (`src/lib/rng.ts`).
- The rule-based evaluation engine must keep working with **zero external API keys or database** — that's a hard product requirement, not an implementation detail. New features should degrade gracefully rather than require `DATABASE_URL` or an LLM key.
- Keep the UI dark, professional, and free of decorative animation — see `src/app/globals.css` and the existing `src/components/ui/*` primitives before adding new ones.

## Adding a new attack category or detector

1. Add the category to `src/lib/categories.ts`.
2. Add a seed attack to `src/lib/engine/seeds.ts`.
3. Add or extend a detector in `src/lib/detection/`.
4. Wire it into `runDetector` in `src/lib/detection/index.ts`.
5. Add a research card to `src/lib/research.ts`.
6. Add unit tests covering both true positives and expected non-matches.

## Reporting bugs / proposing features

Open a GitHub issue with a clear description and, if applicable, the exact policy YAML and prompt that produced unexpected behavior.
