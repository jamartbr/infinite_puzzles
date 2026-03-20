import type { GameStatus } from '@/types'

// A pair of operands that must appear once as sum, once as product
export interface TetonorPair {
  a: number
  b: number
}

// Current usage (by user) of a pair of numbers
export interface PairUsage {
  usedInSum: boolean
  usedInProduct: boolean
  done: boolean
}

// One cell in the grid
export interface TetonorCell {
  id: string          // unique id, e.g. "cell-0-0"
  target: number      // the result the player must reach
}

// The operator the player chose for a cell
export type TetonorOp = '+' | '×' | null

// The player's current entry for one grid cell
export interface TetonorEntry {
  left: string        // raw input string for left operand
  op: TetonorOp
  right: string       // raw input string for right operand
}

// One slot in the operand strip (may be hidden = blank to deduce)
export interface TetonorSlot {
  value: number
  hidden: boolean     // if true, player must deduce it
  userValue?: string  // relevant only when hidden is true
}

export interface TetonorState {
  // Grid of target numbers
  cells: TetonorCell[]
  // Sorted strip of operand slots
  strip: TetonorSlot[]
  // Underlying pairs used to generate the puzzle
  pairs: TetonorPair[]
  // Player entries: keyed by cell id
  entries: Map<string, TetonorEntry>
  moves: number
  status: GameStatus
  level: number
}