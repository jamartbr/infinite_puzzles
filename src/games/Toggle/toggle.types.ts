import type { GameStatus } from '@/types'

/** Valor de una celda: 0, 1, o null (vacía) */
export type ToggleCell = 0 | 1 | null

export interface ToggleState {
  size:     number
  /** Tablero del jugador */
  board:    ToggleCell[][]
  /** Celdas pre-rellenadas — inamovibles */
  given:    boolean[][]
  /** Solución completa */
  solution: number[][]
  /** Número de cambios por fila (índice = fila) */
  rowClues: number[]
  /** Número de cambios por columna (índice = columna) */
  colClues: number[]
  moves:    number
  status:   GameStatus
  level:    number
}

export type LineStatus = 'done' | 'impossible' | 'partial'