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