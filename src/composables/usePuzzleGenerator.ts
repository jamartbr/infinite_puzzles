/**
 * Utilidades de generación de puzzles compartidas entre juegos.
 */

/** Mezcla un array en su lugar (Fisher-Yates) y lo devuelve */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Devuelve un entero aleatorio en [min, max] */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Devuelve un elemento aleatorio de un array */
export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Genera un rango [0, n) en orden aleatorio */
export function shuffledRange(n: number): number[] {
  return shuffle(Array.from({ length: n }, (_, i) => i))
}

/** Tipo posición 2D */
export type Pos = { r: number; c: number }

/** Vecinos ortogonales de (r, c) dentro de un grid n×n */
export function orthogonalNeighbors(r: number, c: number, n: number): Pos[] {
  return [
    { r: r - 1, c },
    { r: r + 1, c },
    { r, c: c - 1 },
    { r, c: c + 1 },
  ].filter((p) => p.r >= 0 && p.r < n && p.c >= 0 && p.c < n)
}
