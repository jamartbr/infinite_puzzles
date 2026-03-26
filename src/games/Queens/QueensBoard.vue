<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/store'
import {
  createQueensState,
  validateQueens,
  QUEEN_COLORS,
} from './queens.logic'
import type { QueensState, QueensCell } from './queens.types'

const router = useRouter()
const store  = useGameStore()
const startedAt = ref(Date.now())
const level     = ref(0)

const LEVELS = [
  { value: 0, label: '🟢 Fácil' },
  { value: 1, label: '🟡 Medio' },
  { value: 2, label: '🔴 Difícil' },
]

// ── Estado ────────────────────────────────────────────────────────────────
const props = defineProps<{
  initialState: QueensState
  daily?: boolean
}>()
const emit = defineEmits<{
  'update:state': [state: QueensState]
  'win': []
}>()

const state     = ref<QueensState>(props.initialState)
const mode      = ref<'queen' | 'x'>('queen')

// ── Derivados ─────────────────────────────────────────────────────────────
const queensPlaced = computed(() => {
  let count = 0
  for (const row of state.value.board)
    for (const cell of row)
      if (cell === 'queen') count++
  return count
})

const usedColors = computed(() => {
  const set = new Set<number>()
  for (const row of state.value.regions)
    for (const c of row)
      set.add(c % QUEEN_COLORS.length)
  return [...set].sort()
})

function colorFor(regionIdx: number) {
  return QUEEN_COLORS[regionIdx % QUEEN_COLORS.length]
}

function cellStyle(r: number, c: number) {
  const color = colorFor(state.value.regions[r][c])
  return {
    background: color.fill,
    borderColor: color.bg + '88',
  }
}

// ── Acciones ──────────────────────────────────────────────────────────────
function clickCell(r: number, c: number) {
  if (state.value.status === 'won') return

  const current: QueensCell = state.value.board[r][c]

  if (mode.value === 'queen') {
    state.value.board[r][c] = current === 'queen' ? 'empty' : 'queen'
  } else {
    state.value.board[r][c] = current === 'x' ? 'empty' : 'x'
  }

  state.value.moves++
  state.value.status = 'playing'

  if (validateQueens(state.value.board, state.value.regions, state.value.size)) {
    state.value.status = 'won'
    if (!props.daily) {
        store.recordResult({
        gameId: 'queens',
        won: true,
        score: Math.max(1, 100 - state.value.moves),
        durationMs: Date.now() - startedAt.value,
        timestamp: Date.now(),
        })
    }
    emit('win')
    emit('update:state', state.value)
  }
}

function resetBoard() {
  state.value.board = Array.from({ length: state.value.size }, () =>
    Array<QueensCell>(state.value.size).fill('empty'),
  )
  state.value.moves  = 0
  state.value.status = 'idle'
}

function newGame() {
  state.value = createQueensState(state.value.size, level.value)
  startedAt.value = Date.now()
}

function onLevelChange(lv: number) {
  level.value = lv
  state.value = createQueensState(state.value.size, level.value)
}
</script>

<template>
  <div class="queens">
    <header class="game-header">
      <button class="back-btn" @click="router.push('/')">← Volver</button>
      <div class="header-meta">
        <span class="game-title">👑 Queens</span>
        <span class="moves-pill">
          {{ queensPlaced }}/{{ state.size }} reinas · {{ state.moves }} movimientos
        </span>
      </div>
    </header>

    <!-- Reglas -->
    <ul class="rules-row">
      <li>1 reina por fila</li>
      <li>1 reina por columna</li>
      <li>1 reina por color</li>
      <li>Sin contacto (ni diagonal)</li>
    </ul>

    <!-- Nivel -->
    <div v-if="!(props.daily)" class="mode-row">
      <button
        v-for="lv in LEVELS"
        :key="lv.value"
        class="btn btn-ghost btn-sm"
        :class="{ active: level === lv.value }"
        @click="onLevelChange(lv.value)"
      >{{ lv.label }}</button>
    </div>

    <!-- Modo -->
    <div class="mode-row">
      <button
        :class="['mode-btn', { active: mode === 'queen' }]"
        @click="mode = 'queen'"
      >
        👑 Colocar reina
      </button>
      <button
        :class="['mode-btn', { active: mode === 'x' }]"
        @click="mode = 'x'"
      >
        ✕ Marcar descartada
      </button>
      <button class="btn btn-ghost btn-sm" @click="resetBoard">↩ Reiniciar</button>
      <button v-if="!props.daily" class="btn btn-ghost btn-sm" @click="newGame">🔄 Nuevo tablero</button>
    </div>

    <!-- Leyenda de colores -->
    <div class="legend">
      <div
        v-for="idx in usedColors"
        :key="idx"
        class="legend-item"
      >
        <span
          class="legend-dot"
          :style="{ background: colorFor(idx).fill, borderColor: colorFor(idx).bg }"
        />
        {{ colorFor(idx).name }}
      </div>
    </div>

    <!-- Tablero -->
    <div
      class="board"
      :style="{ gridTemplateColumns: `repeat(${state.size}, 1fr)` }"
    >
      <template v-for="(row, r) in state.board" :key="`row-${r}`">
        <button
          v-for="(_, c) in row"
          :key="`${r}-${c}`"
          class="cell"
          :class="{
            'has-queen': state.board[r][c] === 'queen',
            'has-x':     state.board[r][c] === 'x',
          }"
          :style="cellStyle(r, c)"
          :aria-label="`Fila ${r + 1}, columna ${c + 1}`"
          @click="clickCell(r, c)"
        >
          <span v-if="state.board[r][c] === 'queen'" class="queen-icon">♛</span>
          <span v-else-if="state.board[r][c] === 'x'" class="x-icon">✕</span>
        </button>
      </template>
    </div>

    <!-- Resultado -->
    <div v-if="state?.status === 'won'" class="result-box">
      <p class="result-emoji">🔥</p>
      <p class="result-title">¡Puzzle resuelto!</p>
      <p class="result-sub">Resuelto en {{ ((Date.now() - startedAt) / 1000).toFixed(0) }}s.</p>
      <button v-if="!props.daily" class="btn btn-primary" @click="newGame">Nuevo tablero</button>
    </div>
  </div>
</template>

<style scoped>
.queens {
  max-width: 680px;
  margin: 0 auto;
  padding: 28px 24px 60px;
}

.game-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}
.back-btn {
  align-self: flex-start;
  background: none;
  border: 1px solid var(--border);
  color: var(--muted);
  padding: 7px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  transition: all var(--transition);
}
.back-btn:hover { border-color: var(--text); color: var(--text); }
.header-meta { display: flex; justify-content: space-between; align-items: center; }
.game-title  { font-size: 24px; font-weight: 700; }
.moves-pill  {
  background: var(--surface-2);
  border: 1px solid var(--border);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  color: var(--muted);
}

.rules-row {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.rules-row li {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 5px 12px;
  font-size: 12px;
  color: var(--muted);
}

.mode-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.mode-btn {
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
  font-family: var(--font-sans);
  font-size: 13px;
  transition: all var(--transition);
}
.mode-btn.active {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(88 101 242 / 0.1);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--muted);
}
.legend-dot {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 2px solid;
  flex-shrink: 0;
}

/* Tablero */
.board {
  display: grid;
  gap: 3px;
  width: fit-content;
  margin-bottom: 20px;
}
.cell {
  width: 58px;
  height: 58px;
  border-radius: 8px;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: filter var(--transition), transform var(--transition);
  position: relative;
  font-size: 0; /* oculta texto por defecto */
}
.cell:hover { filter: brightness(1.3); transform: scale(1.04); }

.queen-icon {
  font-size: 26px;
  line-height: 1;
  color: rgba(255 255 255 / 0.9);
  filter: drop-shadow(0 1px 2px rgba(0 0 0 / 0.4));
}
.x-icon {
  font-size: 16px;
  color: rgba(255 255 255 / 0.4);
  font-weight: 700;
}

/* Botones */
.btn {
  padding: 10px 20px;
  border-radius: var(--radius-md);
  border: none;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  transition: all var(--transition);
}
.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:hover { background: var(--accent-h); }
.btn-ghost {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
}
.btn-ghost:hover { border-color: var(--accent); }
.btn-sm { padding: 7px 14px; font-size: 12px; }

/* Resultado */
.result-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 32px;
  text-align: center;
  animation: fadeIn 0.4s ease;
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } }
.result-emoji { font-size: 44px; margin-bottom: 12px; }
.result-title { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
.result-sub   { color: var(--muted); margin-bottom: 20px; }

@media (max-width: 480px) {
  .cell { width: 46px; height: 46px; }
}
</style>
