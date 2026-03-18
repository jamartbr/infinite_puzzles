import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameResult, GameId } from '@/types'

export const useGameStore = defineStore('game', () => {
  // ── Estado ─────────────────────────────────────────────────
  const history = ref<GameResult[]>(loadHistory())

  // ── Getters ────────────────────────────────────────────────
  const totalGamesPlayed = computed(() => history.value.length)

  const bestScoreByGame = computed(() => {
    const map = new Map<GameId, number>()
    for (const result of history.value) {
      const current = map.get(result.gameId) ?? 0
      if (result.score > current) map.set(result.gameId, result.score)
    }
    return map
  })

  const winRateByGame = computed(() => {
    const map = new Map<GameId, number>()
    const games: GameId[] = ['queens', 'zip', 'slant']

    for (const gameId of games) {
      const played = history.value.filter((r) => r.gameId === gameId)
      const won = played.filter((r) => r.won).length
      map.set(gameId, played.length === 0 ? 0 : Math.round((won / played.length) * 100))
    }
    return map
  })

  // ── Acciones ───────────────────────────────────────────────
  function recordResult(result: GameResult) {
    history.value.push(result)
    saveHistory(history.value)
  }

  function clearHistory() {
    history.value = []
    localStorage.removeItem('infinite-puzzles:history')
  }

  // ── Persistencia ───────────────────────────────────────────
  function saveHistory(data: GameResult[]) {
    try {
      localStorage.setItem('infinite-puzzles:history', JSON.stringify(data))
    } catch {
      // cuota excedida o modo privado — ignorar silenciosamente
    }
  }

  function loadHistory(): GameResult[] {
    try {
      const raw = localStorage.getItem('infinite-puzzles:history')
      return raw ? (JSON.parse(raw) as GameResult[]) : []
    } catch {
      return []
    }
  }

  return {
    history,
    totalGamesPlayed,
    bestScoreByGame,
    winRateByGame,
    recordResult,
    clearHistory,
  }
})
