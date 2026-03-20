import type { GameStatus } from '@/types'

/** Clave canónica de una arista */
export type EdgeKey = string   // "r1,c1-r2,c2" con r1≤r2, c1≤c2

export type EdgeState = 'unknown' | 'on' | 'off'

export interface LoopyState {
  size:      number
  /** clues[r][c] = número de aristas activas alrededor de esa celda, o null si no hay pista */
  clues:     (number | null)[][]
  /** Estado actual de cada arista según el jugador */
  edges:     Map<EdgeKey, EdgeState>
  /** Conjunto de aristas que forman la solución */
  solution:  Set<EdgeKey>
  status:    GameStatus
  level:     number
}