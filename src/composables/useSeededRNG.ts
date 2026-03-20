/**
 * Mulberry32 — fast seedable PRNG, good statistical quality
 * Returns a function that produces floats in [0, 1)
 */
export function seededRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s += 0x6d2b79f5
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }
}

/** Converts a YYYY-MM-DD string to a numeric seed */
export function dateSeed(dateStr: string): number {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = Math.imul(31, hash) + dateStr.charCodeAt(i) | 0
  }
  return hash >>> 0
}

/** Returns today's date as YYYY-MM-DD */
export function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Seeded shuffle (Fisher-Yates) */
export function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Seeded integer in [min, max] */
export function seededRandInt(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1))
}