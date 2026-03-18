import type { GameStatus } from '@/types';

/** Valor de una celda en Slant: '/' , '\'  o ' ' (vacía) */
export type SlantCell = '/' | '\\' | ' ';

/** Estado de una celda de pista (esquina) en Slant */
export type SlantClue = 0 | 1 | 2 | 3 | null;

/** Tablero de pistas: clues[row][col] = pista en la esquina */
export type SlantClues = SlantClue[][];

export interface SlantState {
  size: number;                // lado del tablero (ej: 6)
  board: SlantCell[][];        // celdas del jugador, null = vacía
  clues: SlantClues;           // pistas en las esquinas
  solution: SlantCell[][];     // solución completa
  moves: number
  status: GameStatus
};