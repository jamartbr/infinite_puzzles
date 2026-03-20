import { dateSeed, todayString, seededRng, seededRandInt } from './useSeededRNG'
import type { GameId } from '@/types'

export type DailyGameId = Extract<GameId, 'tetonor' | 'loopy' | 'slant'>

export interface DailyMeta {
  date:    string
  gameId:  DailyGameId
  level:   number
  size:    number        // numOperands for tetonor, grid size for loopy and slant
  seed:    number
}

const GAME_IDS: DailyGameId[] = ['tetonor', 'loopy', 'slant']

const LS_STATE_KEY = 'daily_state'

/** Derives today's puzzle parameters deterministically from the date */
export function getDailyMeta(): DailyMeta {
  const date  = todayString()
  const seed  = dateSeed(date)
  const rng   = seededRng(seed)

  const gameId = GAME_IDS[Math.floor(rng() * GAME_IDS.length)] as DailyGameId
  const level  = Math.floor(rng() * 3)

  let size: number
  switch (gameId) {
    case 'tetonor': size = seededRandInt(6, 10, rng) * 2; break  // 12–20 operands
    case 'loopy':   size = 5;                              break  // always 5×5
    case 'slant':   size = 6;      break  // 6–8
    // case 'queens':  size = seededRandInt(6, 9, rng);      break  // 6–9
    default:        size = 5
  }

  return { date, gameId, level, size, seed }
}

/** Persist arbitrary state to localStorage under today's key */
export function saveDailyState(state: unknown): void {
  const meta = getDailyMeta()
  try {
    localStorage.setItem(LS_STATE_KEY, JSON.stringify({
      date:   meta.date,
      gameId: meta.gameId,
      state:  serializeState(state),
    }))
  } catch { /* storage full or unavailable */ }
}

/** Load persisted state if it belongs to today */
export function loadDailyState(): unknown | null {
  try {
    const raw = localStorage.getItem(LS_STATE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const meta = getDailyMeta()
    if (parsed.date   !== meta.date)   return null
    if (parsed.gameId !== meta.gameId) return null
    return deserializeState(parsed.state)
  } catch {
    return null
  }
}

// ── Serialization helpers ─────────────────────────────────────────────────
// Map and Set are not JSON-serializable — convert to arrays

function serializeState(state: unknown): unknown {
  if (state === null || typeof state !== 'object') return state
  if (state instanceof Map) {
    return { __type: 'Map', entries: [...(state as Map<unknown,unknown>).entries()].map(([k,v]) => [k, serializeState(v)]) }
  }
  if (state instanceof Set) {
    return { __type: 'Set', values: [...(state as Set<unknown>).values()].map(serializeState) }
  }
  if (Array.isArray(state)) return state.map(serializeState)
  const obj: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(state as object))
    obj[k] = serializeState(v)
  return obj
}

function deserializeState(data: unknown): unknown {
  if (data === null || typeof data !== 'object') return data
  if (Array.isArray(data)) return data.map(deserializeState)
  const obj = data as Record<string, unknown>
  if (obj.__type === 'Map') {
    return new Map((obj.entries as [unknown,unknown][]).map(([k,v]) => [k, deserializeState(v)]))
  }
  if (obj.__type === 'Set') {
    return new Set((obj.values as unknown[]).map(deserializeState))
  }
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj))
    result[k] = deserializeState(v)
  return result
}