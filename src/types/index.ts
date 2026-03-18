// ============================================================
// Tipos compartidos entre todos los juegos
// ============================================================

/** Identificadores de juego disponibles */
export type GameId = 'queens' | 'zip' | 'slant'

/** Estado de una partida en curso */
export type GameStatus = 'idle' | 'playing' | 'won' | 'lost'

/** Metadatos de un juego para mostrar en la home */
export interface GameMeta {
  id: GameId
  title: string
  emoji: string
  description: string
  difficulty: 1 | 2 | 3
  tags: string[]
}

/** Resultado de una partida */
export interface GameResult {
  gameId: GameId
  won: boolean
  score: number
  durationMs: number
  timestamp: number
}

// ============================================================
// Queens
// ============================================================

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
}

export interface QueensColor {
  name: string
  bg: string   // hex — borde y tono de referencia
  fill: string // hex — fondo de celda (más claro)
}

// ============================================================
// Zip
// ============================================================

/** Posición en el tablero [fila, columna] */
export type Position = [row: number, col: number]

export interface ZipState {
  size: number           // lado del tablero (5×5)
  /** numbers[num] = posición obligatoria; num va de 1 a zipNumCount */
  numbers: Map<number, Position>
  numCount: number       // cuántos números tiene el puzzle
  /** Camino trazado por el jugador hasta el momento */
  path: Position[]
  started: boolean
  status: GameStatus
  /** Camino hamiltoniano solución (usado para validación) */
  solutionPath: Position[]
}

// ============================================================
// Slant
// ============================================================
/** Valor de una celda en Slant: '/' o '\' */
export type SlantCell = '/' | '\\' | ' '

/** Estado de una celda de pista (esquina) en Slant */
export type SlantClue = 0 | 1 | 2 | 3 | null

/** Tablero de pistas: clues[row][col] = pista en la esquina */
export type SlantClues = SlantClue[][]

export interface SlantState {
  size: number                // lado del tablero (ej: 6)
  board: SlantCell[][] // celdas del jugador, null = vacía
  clues: SlantClues           // pistas en las esquinas
  solution: SlantCell[][]     // solución completa
  moves: number
  status: GameStatus
}