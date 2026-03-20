<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/store'
import { getDailyMeta, saveDailyState, loadDailyState } from '@/composables/useDailyPuzzle'

// Game-specific imports
import TetonorBoard from '@/games/Tetonor/TetonorBoard.vue'
import LoopyBoard   from '@/games/Loopy/LoopyBoard.vue'
import SlantBoard   from '@/games/Slant/SlantBoard.vue'
// import QueensBoard from '@/games/Queens/QueensBoard.vue'

const router = useRouter()
const store  = useGameStore()
const meta   = getDailyMeta()

// Check if already solved today
const solvedKey = `daily_solved_${meta.date}`
const alreadySolved = ref(!!localStorage.getItem(solvedKey))

const loading = ref(true)
const gameState = ref<unknown>(null)

async function initPuzzle() {
  loading.value = true
  const saved = loadDailyState()
  if (saved) {
    gameState.value = saved
    loading.value = false
    return
  }
  // Generate fresh — defer so spinner renders
  await new Promise(r => setTimeout(r, 30))

  switch (meta.gameId) {
    case 'tetonor': {
      const { generateDailyTetonorState } = await import('@/games/Tetonor/tetonor.logic')
      gameState.value = generateDailyTetonorState(meta.seed, meta.size, meta.level)
      break
    }
    case 'loopy': {
      const { generateDailyLoopyState } = await import('@/games/Loopy/loopy.logic')
      gameState.value = generateDailyLoopyState(meta.seed, meta.size, meta.level)
      break
    }
    case 'slant': {
      const { generateDailySlantState } = await import('@/games/Slant/slant.logic')
      gameState.value = generateDailySlantState(meta.seed, meta.size, meta.level)
      break
    }
    // case 'queens': {
    //   const { generateDailyQueensState } = await import('@/games/Queens/queens.logic')
    //   gameState.value = generateDailyQueensState(meta.seed, meta.size, meta.level)
    //   break
    // }
    default:
      console.error('Unknown gameId:', meta.gameId)
      loading.value = false
      return
  }

  loading.value = false
}

initPuzzle()

function onStateChange(newState: unknown) {
  gameState.value = newState
  saveDailyState(newState)
}

function onWin() {
  localStorage.setItem(solvedKey, '1')
  alreadySolved.value = true
  store.recordResult({
    gameId:     meta.gameId,
    won:        true,
    score:      100,
    durationMs: 0,
    timestamp:  Date.now(),
  })
}

// Time until next puzzle
const msUntilMidnight = computed(() => {
  const now  = new Date()
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return next.getTime() - now.getTime()
})

function formatCountdown(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

const countdown = ref(formatCountdown(msUntilMidnight.value))
const timer = setInterval(() => {
  countdown.value = formatCountdown(msUntilMidnight.value)
}, 1000)
onUnmounted(() => clearInterval(timer))

const GAME_LABELS: Record<string, string> = {
  tetonor: '🔢 Tetonor',
  loopy:   '⚡ Loopy',
//   queens:  '♛ Queens',
  slant:   '╱ Slant',
}
const LEVEL_LABELS = ['🟢 Fácil', '🟡 Medio', '🔴 Difícil']
</script>

<template>
  <div class="daily">
    <header class="game-header">
      <button class="back-btn" @click="router.push('/')">← Volver</button>
      <div class="header-meta">
        <span class="game-title">📅 Puzzle del día</span>
        <span class="meta-pill">
          {{ GAME_LABELS[meta.gameId] }} · {{ LEVEL_LABELS[meta.level] }}
        </span>
      </div>
    </header>

    <p class="date-label">{{ meta.date }}</p>

    <!-- Already solved -->
    <div v-if="alreadySolved" class="solved-box">
      <p class="result-emoji">🏆</p>
      <p class="result-title">¡Ya resolviste el puzzle de hoy!</p>
      <p class="result-sub">Vuelve mañana en:</p>
      <p class="countdown">{{ countdown }}</p>
      <button class="btn btn-ghost" @click="router.push('/')">Volver al inicio</button>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="loading-box">
      <span class="spinner" />
      <span>Generando puzzle del día…</span>
    </div>

    <!-- Game boards -->
    <template v-else-if="gameState">
        <TetonorBoard
            v-if="meta.gameId === 'tetonor'"
            :initial-state="(gameState as any)"
            :daily="true"
            @update:state="onStateChange"
            @win="onWin"
        />
        <LoopyBoard
            v-else-if="meta.gameId === 'loopy'"
            :initial-state="(gameState as any)"
            :daily="true"
            @update:state="onStateChange"
            @win="onWin"
        />
        <SlantBoard
            v-else-if="meta.gameId === 'slant'"
            :initial-state="(gameState as any)"
            :daily="true"
            @update:state="onStateChange"
            @win="onWin"
        />
        <!-- <QueensBoard
            v-else-if="meta.gameId === 'queens'"
            :initial-state="(gameState as any)"
            :daily="true"
            @update:state="onStateChange"
            @win="onWin"
        /> -->
    </template>
  </div>
</template>

<style scoped>
.daily {
  max-width: 100%;
  margin: 0 auto;
  padding: 28px 24px 60px;
}
.game-header {
  display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px;
}
.back-btn {
  align-self: flex-start; background: none;
  border: 1px solid var(--border); color: var(--muted);
  padding: 7px 14px; border-radius: var(--radius-sm);
  font-size: 13px; cursor: pointer; transition: all var(--transition);
}
.back-btn:hover { border-color: var(--text); color: var(--text); }
.header-meta { display: flex; justify-content: space-between; align-items: center; }
.game-title  { font-size: 24px; font-weight: 700; }
.meta-pill {
  background: var(--surface-2); border: 1px solid var(--border);
  padding: 4px 12px; border-radius: 20px; font-size: 12px; color: var(--muted);
}
.date-label {
  font-size: 12px; color: var(--muted); margin-bottom: 20px;
  text-transform: uppercase; letter-spacing: 0.08em;
}

/* Loading */
.loading-box {
  display: flex; align-items: center; gap: 12px;
  padding: 48px; color: var(--muted); font-size: 14px;
  justify-content: center;
}
.spinner {
  width: 22px; height: 22px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--accent);
  animation: spin 0.7s linear infinite; flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Solved */
.solved-box {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 48px 32px;
  text-align: center; max-width: 400px; margin: 40px auto 0;
}
.result-emoji { font-size: 52px; margin-bottom: 16px; }
.result-title { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
.result-sub   { color: var(--muted); margin-bottom: 12px; }
.countdown    {
  font-family: var(--font-mono); font-size: 32px; font-weight: 700;
  color: var(--accent); margin-bottom: 24px; letter-spacing: 0.05em;
}
.btn {
  padding: 10px 20px; border-radius: var(--radius-md); border: none;
  font-family: var(--font-sans); font-size: 14px; font-weight: 600; cursor: pointer;
}
.btn-ghost {
  background: var(--surface); border: 1px solid var(--border); color: var(--text);
}
.btn-ghost:hover { border-color: var(--accent); }
</style>