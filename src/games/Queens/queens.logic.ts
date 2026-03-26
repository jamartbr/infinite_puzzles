import { orthogonalNeighbors } from '@/composables/usePuzzleGenerator'
import { seededRng, seededShuffle, shuffledRange } from '@/composables/useSeededRNG'
import type { QueensCell, QueensState, QueensRegions, QueensColor } from '@/games/Queens/queens.types'

// ── Paleta de colores ─────────────────────────────────────────────────────
export const QUEEN_COLORS: QueensColor[] = [
  { name: 'Rosa',    bg: '#e91e8c', fill: '#f48fb133' },
  { name: 'Azul',    bg: '#1565c0', fill: '#90caf933' },
  { name: 'Verde',   bg: '#2e7d32', fill: '#a5d6a733' },
  { name: 'Naranja', bg: '#e65100', fill: '#ffcc8033' },
  { name: 'Morado',  bg: '#6a1b9a', fill: '#ce93d833' },
  { name: 'Cian',    bg: '#00838f', fill: '#80deea33' },
  { name: 'Rojo',    bg: '#b71c1c', fill: '#ef9a9a33' },
  { name: 'Lima',    bg: '#558b2f', fill: '#dcedc833' },
]

// ── Solver N-Queens ───────────────────────────────────────────────────────

/**
 * Resuelve N-Queens con backtracking aleatorizado.
 * Devuelve `solution[row] = col` para cada reina.
 */
export function solveNQueens(n: number, rng: () => number): number[] {
  const queens: number[] = [];

  function isSafe(row: number, col: number): boolean {
    for (let r = 0; r < queens.length; r++) {
      if (queens[r] === col) return false
      if (Math.abs(queens[r] - col) === Math.abs(r - row)) return false
    }
    return true
  }

  function backtrack(row: number, rng: () => number): boolean {
    if (row === n) return true
    for (const col of shuffledRange(n, rng)) {
      if (isSafe(row, col)) {
        queens.push(col)
        if (backtrack(row + 1, rng)) return true
        queens.pop()
      }
    }
    return false
  }

  backtrack(0, rng)
  return queens
}

// ── Generador de regiones ─────────────────────────────────────────────────

/**
 * Genera un mapa de regiones de color a partir de la solución Queens.
 * Cada reina es la semilla de su región; se expande con flood-fill aleatorio.
 */
export function buildRegions(n: number, solution: number[], rng: () => number): QueensRegions {
  const regions: number[][] = Array.from({ length: n }, () => Array(n).fill(-1))

  type Seed = { r: number; c: number; color: number }
  const seeds: Seed[] = solution.map((c, r) => ({ r, c, color: r }))

  // Marcar semillas
  seeds.forEach((s) => (regions[s.r][s.c] = s.color))

  // BFS con expansión probabilística para formas orgánicas
  const queue: Seed[] = [...seeds]
  while (queue.length) {
    const { r, c, color } = queue.shift()!
    for (const nb of orthogonalNeighbors(r, c, n)) {
      if (regions[nb.r][nb.c] === -1 && rng() < 0.6) {
        regions[nb.r][nb.c] = color
        queue.push({ r: nb.r, c: nb.c, color })
      }
    }
  }

  // Relleno de huecos (vecino más cercano)
  let changed = true
  while (changed) {
    changed = false
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (regions[r][c] !== -1) continue
        const filled = orthogonalNeighbors(r, c, n).filter(
          (nb) => regions[nb.r][nb.c] !== -1,
        )
        if (filled.length) {
          regions[r][c] = regions[filled[0].r][filled[0].c]
          changed = true
        }
      }
    }
  }

  // Fallback: asignar color de semilla más cercana
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (regions[r][c] === -1) {
        regions[r][c] = seeds.reduce((best, s) =>
          Math.abs(s.r - r) + Math.abs(s.c - c) <
          Math.abs(seeds[best].r - r) + Math.abs(seeds[best].c - c)
            ? seeds.indexOf(s)
            : best, 0)
      }
    }
  }

  return regions
}

// ── Validación ────────────────────────────────────────────────────────────

/** Devuelve true si la colocación actual de reinas es válida y completa */
export function validateQueens(
  board: QueensCell[][],
  regions: QueensRegions,
  n: number,
): boolean {
  const queens: Array<[number, number]> = []

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (board[r][c] === 'queen') queens.push([r, c])
    }
  }

  if (queens.length !== n) return false

  const rows    = new Set<number>()
  const cols    = new Set<number>()
  const colors  = new Set<number>()

  for (const [r, c] of queens) {
    if (rows.has(r) || cols.has(c) || colors.has(regions[r][c])) return false
    rows.add(r); cols.add(c); colors.add(regions[r][c])
  }

  // Validar diagonales completas
  for (let i = 0; i < queens.length; i++) {
    for (let j = i + 1; j < queens.length; j++) {
      if (Math.abs(queens[i][0] - queens[j][0]) === Math.abs(queens[i][1] - queens[j][1])) {
        return false
      }
    }
  }

  return true
}

// ── Estado inicial ────────────────────────────────────────────────────────

export function createQueensState(
  size = 8,
  level = 0,
  rng: () => number = Math.random
): QueensState {
  // const size     = size ?? (6 + Math.floor(rng() * 3)); // 6–8
  const solution = solveNQueens(size, rng);
  const regions  = buildRegions(size, solution, rng);
  const board    = Array.from({ length: size }, () =>
    Array<QueensCell>(size).fill('empty'),
  );

  return { size, board, regions, solution, moves: 0, status: 'idle', level: level };
};

export function generateDailyQueensState(seed: number, size: number, level: number): QueensState {
  return createQueensState(size, level, seededRng(seed))
}
