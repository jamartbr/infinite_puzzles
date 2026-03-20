import type {
  TetonorPair,
  PairUsage,
  TetonorCell,
  TetonorEntry,
  TetonorSlot,
  TetonorState,
} from './tetonor.types'
import { seededRng, seededShuffle, seededRandInt } from '@/composables/useSeededRNG'


// ── Generador ─────────────────────────────────────────────────────────────

export function generateTetonorState(
  numOperands: number = 16,   // must be even
  level: number = 0,          // determines fraction of strip slots to hide
  rng: () => number = Math.random,
): TetonorState {
  
  const numPairs = Math.floor(numOperands / 2);

  // Generate seeded pairs using rng
  const pairs: TetonorPair[] = Array.from({ length: numPairs }, () => ({
    a: seededRandInt(1, 2 * numPairs, rng),
    b: seededRandInt(1, 2 * numPairs, rng),
  }))

  // Build grid cells: one sum cell and one product cell for each pair
  const cellData: { target: number; pairIdx: number; isSum: boolean }[] = [];
  for (let i = 0; i < pairs.length; i++) {
    const { a, b } = pairs[i];
    cellData.push({ target: a + b,  pairIdx: i, isSum: true  });
    cellData.push({ target: a * b,  pairIdx: i, isSum: false });
  }

  // Shuffle cells into a random grid order
  seededShuffle(cellData, rng);

  // Asing row and col to shuffled targets
  const cells: TetonorCell[] = [];
  for (let idx = 0; idx < numOperands; idx++) {
    cells.push({
        id: `cell-${idx}`,
        target: cellData[idx].target,
      });
  }

  // Build the sorted strip: collect all operands, sort ascending
  const allOperands: number[] = pairs.flatMap(({ a, b }) => [a, b])
  allOperands.sort((x, y) => x - y)

  // Decide which strip slots to hide
  const totalSlots = allOperands.length
  const numHidden = Math.round(totalSlots * level)
  const hiddenIndices = new Set(
    seededShuffle([...Array(totalSlots).keys()], rng).slice(0, numHidden)
  )

  const strip: TetonorSlot[] = allOperands.map((value, i) => ({
    value,
    hidden: hiddenIndices.has(i),
  }))

  return {
    cells,
    strip,
    pairs,
    entries: new Map(),
    moves: 0,
    status: 'idle',
    level: 0,
  }
}

// Seeded daily variant
export function generateDailyTetonorState(seed: number, size: number, level: number): TetonorState {
  return generateTetonorState(size, level, seededRng(seed))
}

// ── Validation ────────────────────────────────────────────────────────────

/** Parse a player's raw input string to a number, or null if invalid (negative)
 * TODO: aceptar sólo los números que estén en el banco de números
 */
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

export function computePairUsages(state: TetonorState): Map<number, PairUsage> {
  const usages = new Map<number, PairUsage>()
  for (let i = 0; i < state.pairs.length; i++) {
    usages.set(i, { usedInSum: false, usedInProduct: false, done: false })
  }

  for (const cell of state.cells) {
    const entry = state.entries.get(cell.id)
    if (!entry || entry.op === null) continue
    const left  = parseOperand(entry.left)
    const right = parseOperand(entry.right)
    if (left === null || right === null) continue

    // Busca el par que coincide con estos operandos y este operador
    for (let i = 0; i < state.pairs.length; i++) {
      const { a, b } = state.pairs[i]
      const usage = usages.get(i)!
      const matches =
        (left === a && right === b) || (left === b && right === a)
      if (!matches) continue

      if (entry.op === '+' && !usage.usedInSum) {
        usage.usedInSum = true
        break
      }
      if (entry.op === '×' && !usage.usedInProduct) {
        usage.usedInProduct = true
        break
      }
    }
  }

  for (const [i, u] of usages) {
    u.done = u.usedInSum && u.usedInProduct
    usages.set(i, u)
  }

  return usages
}

export function computeStripUsed(state: TetonorState): boolean[] {
  // Primero calculamos cuántas veces cada valor está en un par "done"
  const pairUsages = computePairUsages(state)
  const doneByValue = new Map<number, number>()
  for (const [i, u] of pairUsages.entries()) {
    if (!u.done) continue
    const { a, b } = state.pairs[i]
    doneByValue.set(a, (doneByValue.get(a) ?? 0) + 1)
    doneByValue.set(b, (doneByValue.get(b) ?? 0) + 1)
  }

  // Para slots visibles: se tachan consumiendo ocurrencias done de izquierda a derecha
  // Para slots ocultos: solo se tachan si userValue coincide con un valor done disponible
  const consumed = new Map<number, number>()

  return state.strip.map(slot => {
    if (!slot.hidden) {
      const available = doneByValue.get(slot.value) ?? 0
      const soFar     = consumed.get(slot.value) ?? 0
      consumed.set(slot.value, soFar + 1)
      return soFar < available
    } else {
      // Slot oculto: el usuario tiene que haber escrito el valor correcto
      const userVal = parseOperand(slot.userValue ?? '')
      if (userVal === null) return false
      const available = doneByValue.get(userVal) ?? 0
      const soFar     = consumed.get(userVal) ?? 0
      consumed.set(userVal, soFar + 1)
      return soFar < available
    }
  })
}

/**
 * Full puzzle validation:
 * 1. Every cell must be correctly solved.
 * 2. Every pair in the strip must be used exactly once as sum and once as product.
 *    (operands must come from the strip, respecting counts)
 */
export function validateTetonor(state: TetonorState): boolean {
  // Check every cell is correctly filled
  for (const cell of state.cells) {
    const entry = state.entries.get(cell.id)
    if (!entry || !evaluateEntry(entry, cell.target)) return false
  }

  // Check every pair appears exactly once as sum and once as product
  const usages = computePairUsages(state)
  for (const u of usages.values()) {
    if (!u.done) return false
  }

  // Check every strip slot is crossed out (including hidden)
  const stripUsed = computeStripUsed(state)
  return stripUsed.every(Boolean)
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

export function createTetonorState(numOperands=16, level=0): TetonorState {
  return generateTetonorState(numOperands, level);
}