import { ref, readonly } from 'vue'

/**
 * Composable para gestionar la puntuación de una partida.
 * El score empieza en `initialScore` y puede subir o bajar.
 */
export function useScore(initialScore = 5) {
  const score = ref(initialScore)

  function decrement(amount = 1) {
    score.value = Math.max(0, score.value - amount)
  }

  function increment(amount = 1) {
    score.value = score.value + amount
  }

  function reset(value = initialScore) {
    score.value = value
  }

  return {
    score: readonly(score),
    decrement,
    increment,
    reset,
  }
}
