// Deterministic pseudo-random utilities used across the engine so that demo
// data, generated tests, and mutations are fully reproducible without an LLM.

export function hashStringToSeed(input: string): number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

// mulberry32 PRNG
export function createRng(seed: number | string) {
  let a = typeof seed === "string" ? hashStringToSeed(seed) : seed;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

export function pickN<T>(rng: () => number, arr: T[], n: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  while (out.length < Math.min(n, pool.length)) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

export function shortId(prefix: string, seed: string): string {
  const h = hashStringToSeed(seed).toString(36);
  return `${prefix}_${h}`;
}
