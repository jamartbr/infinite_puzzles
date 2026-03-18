import { ref, computed, readonly } from 'vue'

/**
 * Composable para un temporizador de cuenta atrás o cuenta ascendente.
 */
export function useTimer(initialSeconds = 0, countDown = false) {
  const seconds = ref(initialSeconds)
  const running = ref(false)
  let intervalId: ReturnType<typeof setInterval> | null = null

  const formatted = computed(() => {
    const m = Math.floor(Math.abs(seconds.value) / 60)
    const s = Math.abs(seconds.value) % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })

  const progress = computed(() =>
    countDown && initialSeconds > 0
      ? Math.max(0, seconds.value / initialSeconds)
      : 0,
  )

  function start() {
    if (running.value) return
    running.value = true
    intervalId = setInterval(() => {
      if (countDown) {
        seconds.value--
        if (seconds.value <= 0) {
          seconds.value = 0
          stop()
        }
      } else {
        seconds.value++
      }
    }, 1000)
  }

  function stop() {
    running.value = false
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function reset(value = initialSeconds) {
    stop()
    seconds.value = value
  }

  return {
    seconds: readonly(seconds),
    running: readonly(running),
    formatted,
    progress,
    start,
    stop,
    reset,
  }
}
