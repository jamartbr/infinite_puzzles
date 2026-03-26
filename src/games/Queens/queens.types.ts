import type { GameStatus } from '@/types'

/** Una celda del tablero Queens */
export type QueensCell = 'empty' | 'x' | 'queen'

/** Mapa de regiones: regions[row][col] = índice de color (0-based) */
export type QueensRegions = number[][]

export interface QueensState {
  size: number              // lado del tablero (6–8)
  board: QueensCell[][]
  regions: QueensRegions
  solution: number[]        // solution[row] = col donde va la reina
  moves: number
  status: GameStatus
  level: number
}

export interface QueensColor {
  name: string
  bg: string   // hex — borde y tono de referencia
  fill: string // hex — fondo de celda (más claro)
}