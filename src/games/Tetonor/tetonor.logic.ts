import { randInt, shuffle } from '@/composables/usePuzzleGenerator'
import type {
  TetonorPair,
  TetonorCell,
  TetonorEntry,
  TetonorOp,
  TetonorSlot,
  TetonorState,
} from './tetonor.types'

// ── Generator ─────────────────────────────────────────────────────────────
//
// A standard Tetonor puzzle has a 4×4 grid and 8 pairs (16 operands in strip).
// Each pair (a, b) fills exactly two grid cells: one with (a+b), one with (a×b).
// So 8 pairs → 16 grid cells → 4×4.

function generatePairs(count: number): TetonorPair[] {
  const pairs: TetonorPair[] = []
  for (let i = 0; i < count; i++) {
    const a = randInt(1, 12)
    const b = randInt(1, 12)
    pairs.push({ a, b })
  }
  return pairs
}

export function generateTetonorState(
  gridSize = 4,
  hiddenFraction = 0.25,  // fraction of strip slots to hide (blank)
): TetonorState {
  const numPairs = (gridSize * gridSize) / 2  // 8 for a 4×4
  const pairs = generatePairs(numPairs)

  // Build the 16 grid cells: for each pair, one sum cell and one product cell
  const cellData: { target: number; pairIdx: number; isSum: boolean }[] = []
  for (let i = 0; i < pairs.length; i++) {
    const { a, b } = pairs[i]
    cellData.push({ target: a + b,  pairIdx: i, isSum: true  })
    cellData.push({ target: a * b,  pairIdx: i, isSum: false })
  }

  // Shuffle cells into a random grid order
  const shuffledCells = shuffle(cellData)
  const grid: TetonorCell[][] = []
  for (let row = 0; row < gridSize; row++) {
    grid.push([])
    for (let col = 0; col < gridSize; col++) {
      const idx = row * gridSize + col
      grid[row].push({
        id: `cell-${row}-${col}`,
        target: shuffledCells[idx].target,
        row,
        col,
      })
    }
  }

  // Build the sorted strip: collect all operands, sort ascending
  const allOperands: number[] = pairs.flatMap(({ a, b }) => [a, b])
  allOperands.sort((x, y) => x - y)

  // Decide which strip slots to hide
  const totalSlots = allOperands.length
  const numHidden = Math.round(totalSlots * hiddenFraction)
  const hiddenIndices = new Set(
    shuffle([...Array(totalSlots).keys()]).slice(0, numHidden)
  )

  const strip: TetonorSlot[] = allOperands.map((value, i) => ({
    value,
    hidden: hiddenIndices.has(i),
  }))

  return {
    grid,
    strip,
    pairs,
    entries: new Map(),
    moves: 0,
    status: 'idle',
  }
}

// ── Validation ────────────────────────────────────────────────────────────

/** Parse a player's raw input string to a number, or null if invalid */
export function parseOperand(raw: string): number | null {
  const n = Number(raw.trim())
  return raw.trim() !== '' && !isNaN(n) && n > 0 ? n : null
}

/** Evaluate a player's entry against a cell's target */
export function evaluateEntry(
  entry: TetonorEntry,
  target: number,
): boolean {
  const left  = parseOperand(entry.left)
  const right = parseOperand(entry.right)
  if (left === null || right === null || entry.op === null) return false
  const result = entry.op === '+' ? left + right : left * right
  return result === target
}

/**
 * Full puzzle validation:
 * 1. Every cell must be correctly solved.
 * 2. Every pair in the strip must be used exactly once as sum and once as product.
 *    (operands must come from the strip, respecting counts)
 */
export function validateTetonor(state: TetonorState): boolean {
  const { grid, strip, entries } = state

  // Check every cell is correctly filled
  for (const row of grid) {
    for (const cell of row) {
      const entry = entries.get(cell.id)
      if (!entry || !evaluateEntry(entry, cell.target)) return false
    }
  }

  // Build a frequency map of strip values
  const stripFreq = new Map<number, number>()
  for (const slot of strip) {
    stripFreq.set(slot.value, (stripFreq.get(slot.value) ?? 0) + 1)
  }

  // Count how many times each operand value was used across all entries
  const usedFreq = new Map<number, number>()
  for (const row of grid) {
    for (const cell of row) {
      const entry = entries.get(cell.id)!
      const left  = parseOperand(entry.left)!
      const right = parseOperand(entry.right)!
      usedFreq.set(left,  (usedFreq.get(left)  ?? 0) + 1)
      usedFreq.set(right, (usedFreq.get(right) ?? 0) + 1)
    }
  }

  // Used operands must exactly match strip frequency
  for (const [val, count] of usedFreq) {
    if ((stripFreq.get(val) ?? 0) !== count) return false
  }
  for (const [val, count] of stripFreq) {
    if ((usedFreq.get(val) ?? 0) !== count) return false
  }

  return true
}

// ── Entry helpers ─────────────────────────────────────────────────────────

export function emptyEntry(): TetonorEntry {
  return { left: '', op: null, right: '' }
}

export function getEntry(
  entries: Map<string, TetonorEntry>,
  cellId: string,
): TetonorEntry {
  if (!entries.has(cellId)) entries.set(cellId, emptyEntry())
  return entries.get(cellId)!
}

// ── State factory ─────────────────────────────────────────────────────────

export function createTetonorState(): TetonorState {
  return generateTetonorState(4, 0.25)
}