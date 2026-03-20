import { shuffle } from '@/composables/usePuzzleGenerator'
import type { SlantCell, SlantClue, SlantClues, SlantState } from './slant.types'
import { seededRng, seededShuffle, seededRandInt } from '@/composables/useSeededRNG'

// ─── Clue validation ──────────────────────────────────────────────────────────
//
// Vertices live on the (size+1)×(size+1) grid of corners.
// Vertex (vy, vx) is touched by the four cells whose corners include it:
//
//   cell (vy-1, vx-1)  →  '\\' connects (vy-1,vx-1)↔(vy,vx)   ← bottom-right corner
//   cell (vy-1, vx)    →  '/'  connects (vy-1,vx+1)↔(vy,vx)    ← bottom-left  corner
//   cell (vy,   vx-1)  →  '/'  connects (vy,vx-1)  ↔(vy+1,vx)  ← top-right    corner
//   cell (vy,   vx)    →  '\\' connects (vy,vx)    ↔(vy+1,vx+1)← top-left     corner
//
// A diagonal "touches" vertex V if V is one of the two endpoints of the line.

function countAtVertex(
  board: (SlantCell | null)[][],
  vy: number,
  vx: number
): number {
  const h = board.length
  const w = board[0]?.length ?? 0
  let count = 0

  // cell top-left of vertex: '\' goes from (vy-1,vx-1) top-left → bottom-right (vy,vx)
  if (vy > 0 && vx > 0 && board[vy - 1][vx - 1] === '\\') count++

  // cell top-right of vertex: '/' goes from (vy-1,vx) top-right → bottom-left (vy,vx)
  if (vy > 0 && vx < w && board[vy - 1][vx] === '/') count++

  // cell bottom-left of vertex: '/' goes from (vy,vx-1) bottom-right → top-left (vy,vx)
  if (vy < h && vx > 0 && board[vy][vx - 1] === '/') count++

  // cell bottom-right of vertex: '\' goes top-left (vy,vx) → bottom-right (vy+1,vx+1)
  if (vy < h && vx < w && board[vy][vx] === '\\') count++

  return count
}

export function checkClues(
  board: (SlantCell | null)[][],
  clues: SlantClues
): boolean {
  const h = board.length
  const w = board[0]?.length ?? 0

  for (let vy = 0; vy <= h; vy++) {
    for (let vx = 0; vx <= w; vx++) {
      const clue: SlantClue | null = clues?.[vy]?.[vx] ?? null
      if (clue === null) continue
      if (countAtVertex(board, vy, vx) !== clue) return false
    }
  }
  return true
}

// ─── Cycle detection ─────────────────────────────────────────────────────────
//
// Model the diagonals as an undirected graph on the (size+1)×(size+1) vertices.
// Each filled cell adds one edge. A valid Slant solution must be a forest (no cycles).

function vertexKey(vy: number, vx: number) {
  return vy * 100 + vx // safe for boards ≤ 99 wide
}

function edgesOf(
  board: (SlantCell | null)[][]
): Array<[number, number, number, number]> {
  const edges: Array<[number, number, number, number]> = []
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < (board[0]?.length ?? 0); c++) {
      const cell = board[r][c]
      if (cell === '\\') {
        edges.push([r, c, r + 1, c + 1])        // top-left → bottom-right
      } else if (cell === '/') {
        edges.push([r, c + 1, r + 1, c])        // top-right → bottom-left
      }
    }
  }
  return edges
}

// Union-Find
function hasCycle(board: (SlantCell | null)[][]): boolean {
  const parent = new Map<number, number>()

  function find(k: number): number {
    if (!parent.has(k)) parent.set(k, k)
    if (parent.get(k) !== k) parent.set(k, find(parent.get(k)!))
    return parent.get(k)!
  }

  function union(a: number, b: number): boolean {
    const ra = find(a), rb = find(b)
    if (ra === rb) return false // cycle!
    parent.set(ra, rb)
    return true
  }

  for (const [r1, c1, r2, c2] of edgesOf(board)) {
    const u = vertexKey(r1, c1)
    const v = vertexKey(r2, c2)
    if (!union(u, v)) return true
  }
  return false
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns true only if board is fully filled, clues all match, and no cycles. */
export function isValidSlantState(state: SlantState, clues: SlantClues): boolean {
  const { board } = state

  // Must be fully filled
  for (const row of board)
    for (const cell of row)
      if (cell === ' ') return false

  if (!checkClues(board, clues)) return false
  if (hasCycle(board)) return false

  return true
}

// ─── Puzzle generator ────────────────────────────────────────────────────────

/** Generate a random valid Slant solution for an n×n board. */
export function generateSolution(
  n: number,
  rng: () => number = Math.random,
): SlantCell[][] {
  // Try random boards until we find one without cycles.
  // For small n this is fast; for n≥8 a smarter approach is needed but fine here.
  const choices: SlantCell[] = ['/', '\\']
  for (let attempt = 0; attempt < 2000; attempt++) {
    const board: SlantCell[][] = Array.from({ length: n }, () =>
      Array.from({ length: n }, () =>
        choices[Math.floor(rng() * 2)] as SlantCell
      )
    )
    if (!hasCycle(board)) return board as SlantCell[][]
  }
  // Fallback: all '\'  is always a valid tree (path graph)
  return Array.from({ length: n }, () => Array(n).fill('\\') as SlantCell[])
}

/** Derive clues from a complete solution. Pass `density` 0–1 to control hint sparsity. */
export function deriveCluess(
  solution: SlantCell[][],
  density = 0.45,
  rng: () => number = Math.random,
): SlantClues {
  const n = solution.length
  const clues: SlantClues = Array.from({ length: n + 1 }, () =>
    Array(n + 1).fill(null)
  )
  for (let vy = 0; vy <= n; vy++) {
    for (let vx = 0; vx <= n; vx++) {
      if (rng() < density) {
        clues[vy][vx] = countAtVertex(solution as (SlantCell | null)[][], vy, vx) as SlantClue
      }
    }
  }
  return clues
}

/**
 * Count solutions to the puzzle, up to `limit`.
 * Returns as soon as `limit` is reached so we never do unnecessary work.
 */
function countSolutions(
  board: (SlantCell | null)[][],
  clues: SlantClues,
  n: number,
  limit = 2
): number {
  // Flatten empty cells into a list to iterate over
  const empty: [number, number][] = []
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (board[y][x] === null) empty.push([y, x])

  let count = 0

  function bt(idx: number): void {
    if (count >= limit) return
    if (idx === empty.length) {
      // Full board — check clues and no-cycle
      if (checkClues(board, clues) && !hasCycle(board)) count++
      return
    }
    const [y, x] = empty[idx]
    for (const val of ['/', '\\'] as SlantCell[]) {
      board[y][x] = val
      // Prune: if any fully-surrounded vertex already violates its clue, skip
      if (!isLocallyValid(board, clues, y, x, n)) continue
      bt(idx + 1)
      if (count >= limit) return
    }
    board[y][x] = null
  }

  bt(0)
  return count
}



function getAdjCells(board: (SlantCell | null)[][], vy: number, vx: number, n: number) {
  return [
    vy > 0 && vx > 0 ? board[vy - 1][vx - 1] : null,
    vy > 0 && vx < n ? board[vy - 1][vx]     : null,
    vy < n && vx > 0 ? board[vy][vx - 1]     : null,
    vy < n && vx < n ? board[vy][vx]          : null,
  ]
}

/** Check only the 4 vertices touching cell (y,x) — fast pruning for backtracking */
function isLocallyValid(
  board: (SlantCell | null)[][],
  clues: SlantClues,
  y: number, x: number, n: number
): boolean {
  for (const [vy, vx] of [[y,x],[y,x+1],[y+1,x],[y+1,x+1]]) {
    const clue = clues?.[vy]?.[vx]
    if (clue === null || clue === undefined) continue
    const adj = getAdjCells(board, vy, vx, n)
    // Only validate if all adjacent cells are filled (vertex is complete)
    if (adj.every(c => c !== null)) {
      if (countAtVertex(board, vy, vx) !== clue) return false
    } else {
      // If partially filled, check we haven't already exceeded the clue
      if (countAtVertex(board, vy, vx) > clue) return false
    }
  }
  return true
}

function deriveMinimalClues(solution: SlantCell[][], n: number): SlantClues {
  // Start with all clues
  const clues: SlantClues = Array.from({ length: n + 1 }, (_, vy) =>
    Array.from({ length: n + 1 }, (_, vx) =>
      countAtVertex(solution as (SlantCell|null)[][], vy, vx) as SlantClue
    )
  )

  // Shuffle vertex positions and try removing each
  const positions = Array.from({ length: (n+1)**2 }, (_, i) => [Math.floor(i/(n+1)), i%(n+1)])
  shuffle(positions)

  for (const [vy, vx] of positions) {
    const saved = clues[vy][vx]
    clues[vy][vx] = null

    // Clone board as all-null for solving
    const emptyBoard = Array.from({ length: n }, () => Array(n).fill(null))
    if (countSolutions(emptyBoard, clues, n, 2) !== 1) {
      clues[vy][vx] = saved // restore — removing this clue broke uniqueness
    }
  }

  return clues
}

/** Create a fresh SlantState from scratch. */
export function createSlantState(
  size = 6,
  level = 0,
  rng: () => number = Math.random,
): SlantState {
  const solution = generateSolution(size, rng)
  const clues = deriveMinimalClues(solution, size)
  return {
    size: size,
    board: Array.from({ length: size }, () => Array(size).fill(' ')),
    clues,
    solution,
    moves: 0,
    status: 'playing',
  }
}

export function generateDailySlantState(seed: number, size: number, level: number): SlantState {
  return createSlantState(size, level, seededRng(seed))
}
