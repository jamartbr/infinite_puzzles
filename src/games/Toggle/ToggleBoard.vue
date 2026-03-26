<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/store'
import {
  checkWin,
  rowStatus,
  colStatus,
  createToggleState,
} from './toggle.logic'
import type { ToggleCell, ToggleState, LineStatus } from './toggle.types'

const router    = useRouter()
const store     = useGameStore()

const LEVELS = [
  { value: 0, label: '🟢 Fácil' },
  { value: 1, label: '🟡 Medio' },
  { value: 2, label: '🔴 Difícil' },
]

const SIZES = [6, 7, 8, 9]

// ── Estado ────────────────────────────────────────────────────────────────

const props = defineProps<{
  initialState: ToggleState
  daily?: boolean
}>()
const emit = defineEmits<{
  'update:state': [state: ToggleState]
  'win': []
}>()

const state = ref<ToggleState>(props.initialState) 
const startedAt = ref(Date.now())
const showErrors = ref(false)
const level     = ref(state.value.level)
const size = ref(state.value.size)
const loading = ref(false)

// ── Derivados ─────────────────────────────────────────────────────────────

const filledCount = computed(() => {
    let n = 0
    for (const row of state.value.board) {
        for (const cell of row) {
            if (cell != null) n++
        }
    }
    return n
})

const totalCells = computed(() => state.value.size * state.value.size)

// ── Constantes de la disposición ──────────────────────────────────────────

const CELL    = 52
const CLUE_W  = 28   // width of clue column/row
const PAD     = 4

const svgW = computed(() => CLUE_W + state.value.size * CELL + PAD)
const svgH = computed(() => CLUE_W + state.value.size * CELL + PAD)

function cx(c: number) { return CLUE_W + c * CELL + CELL / 2 }   // center x of col c
function cy(r: number) { return CLUE_W + r * CELL + CELL / 2 }   // center y of row r
function cellX(c: number) { return CLUE_W + c * CELL }
function cellY(r: number) { return CLUE_W + r * CELL }

// ── Helpers ───────────────────────────────────────────────────────────────

function rStatus(r: number) { return showErrors.value ? rowStatus(state.value, r) : 'partial' }
function cStatus(c: number) { return showErrors.value ? colStatus(state.value, c) : 'partial' }

function cellClass(r: number, c: number): string {
  const v = state.value.board[r][c]
  if (v === null) return 'cell-empty'
  return v === 1 ? state.value.given[r][c] ? 'cell-given-one' : 'cell-one' : state.value.given[r][c] ? 'cell-given-zero' : 'cell-zero'
}

// ── Acciones ──────────────────────────────────────────────────────────────

function clickCell(r: number, c: number) {
  if (state.value.status === 'won') return
  if (state.value.given[r][c]) return

  const cur = state.value.board[r][c]
  const next: ToggleCell = cur === null ? 0 : cur === 0 ? 1 : null

  // Immutable row update for reactivity
  state.value.board[r] = [...state.value.board[r]]
  state.value.board[r][c] = next
  state.value.moves++
  state.value.status = 'playing'

  if (checkWin(state.value)) {
    state.value.status = 'won'
    if (!props.daily) {
      store.recordResult({
        gameId:     'toggle',
        won:        true,
        score:      Math.max(1, 100 - state.value.moves),
        durationMs: Date.now() - startedAt.value,
        timestamp:  Date.now(),
      })
    }
    emit('win')
  }
  emit('update:state', state.value)
}

function resetBoard() {
  const s = state.value.size
  state.value.board = Array.from({ length: s }, (_, r) =>
    Array.from({ length: s }, (_, c) =>
      state.value.given[r][c] ? state.value.solution[r][c] as ToggleCell : null
    )
  )
  state.value.moves  = 0
  state.value.status = 'idle'
  emit('update:state', state.value)
}

function newGame() {
  loading.value = true
  setTimeout(() => {
    state.value     = createToggleState(size.value, level.value)
    startedAt.value = Date.now()
    loading.value   = false
    emit('update:state', state.value)
  }, 30)
}

function onLevelChange(lv: number) {
  level.value = lv
  newGame()
}

function onSizeChange(sz: number) {
  size.value = sz
  newGame()
}
</script>

<template>
  <div class="toggle">
    <!-- Header -->
    <header class="game-header">
      <button class="back-btn" @click="router.push('/')">← Volver</button>
      <div class="header-meta">
        <span class="game-title">☯︎ Toggle</span>
        <span class="moves-pill">
          {{ filledCount }}/{{ totalCells }} · {{ state.moves }} movimientos
        </span>
      </div>
    </header>

    <!-- Rules -->
    <ul class="rules-row">
      <li>Rellena cada celda con 0 o 1</li>
      <li>El número en cada borde indica los cambios de valor en esa fila/columna</li>
      <li>Las celdas oscuras son fijas</li>
    </ul>

    <!-- Controls -->
    <div v-if="!props.daily" class="controls">
      <div class="control-group">
        <span class="control-label">Nivel</span>
        <div class="btn-row">
          <button
            v-for="lv in LEVELS"
            :key="lv.value"
            class="btn btn-ghost btn-sm"
            :class="{ active: level === lv.value }"
            @click="onLevelChange(lv.value)"
          >{{ lv.label }}</button>
        </div>
      </div>
      <div class="control-group">
        <span class="control-label">Tamaño</span>
        <div class="btn-row">
          <button
            v-for="sz in SIZES"
            :key="sz"
            class="btn btn-ghost btn-sm"
            :class="{ active: size === sz }"
            @click="onSizeChange(sz)"
          >{{ sz }}×{{ sz }}</button>
        </div>
      </div>
    </div>

    <!-- Action row -->
    <div class="action-row">
      <button class="btn btn-ghost btn-sm" @click="resetBoard">↩ Reiniciar</button>
      <button v-if="!props.daily" class="btn btn-ghost btn-sm" @click="newGame">🔄 Nuevo tablero</button>
      <button
        class="btn btn-ghost btn-sm"
        :class="{ active: showErrors }"
        @click="showErrors = !showErrors"
      >{{ showErrors ? '👁 Ocultar errores' : '👁 Mostrar errores' }}</button>
    </div>

    <!-- Spinner -->
    <div v-if="loading" class="loading-box">
      <span class="spinner" /><span>Generando…</span>
    </div>

    <!-- Board -->
    <div v-else class="board-wrap">
      <svg
        :width="svgW"
        :height="svgH"
        :viewBox="`0 0 ${svgW} ${svgH}`"
        class="board-svg"
      >
        <!-- Cell backgrounds -->
        <template v-for="(row, r) in state.board" :key="`row-${r}`">
          <rect
            v-for="(_, c) in row"
            :key="`bg-${r}-${c}`"
            :x="cellX(c)"
            :y="cellY(r)"
            :width="CELL"
            :height="CELL"
            :class="['cell-rect', cellClass(r, c)]"
            @click="clickCell(r, c)"
          />
        </template>

        <!-- Grid lines -->
        <template v-for="i in state.size + 1" :key="`hl-${i}`">
          <line
            :x1="CLUE_W" :y1="CLUE_W + (i-1)*CELL"
            :x2="CLUE_W + state.size*CELL" :y2="CLUE_W + (i-1)*CELL"
            class="grid-line"
          />
        </template>
        <template v-for="i in state.size + 1" :key="`vl-${i}`">
          <line
            :x1="CLUE_W + (i-1)*CELL" :y1="CLUE_W"
            :x2="CLUE_W + (i-1)*CELL" :y2="CLUE_W + state.size*CELL"
            class="grid-line"
          />
        </template>

        <!-- Cell values (0 / 1) -->
        <template v-for="(row, r) in state.board" :key="`vals-${r}`">
          <template v-for="(cell, c) in row" :key="`val-${r}-${c}`">
            <text
              v-if="cell !== null"
              :x="cx(c)"
              :y="cy(r)"
              class="cell-value"
              :class="state.given[r][c] ? cell === 1 ? 'given-one' : 'given-zero' : cell === 1 ? 'value-one' : 'value-zero'"
              dominant-baseline="central"
              text-anchor="middle"
            >{{ cell }}</text>
          </template>
        </template>

        <!-- Row clues (left side) -->
        <template v-for="(clue, r) in state.rowClues" :key="`rc-${r}`">
          <text
            :x="CLUE_W / 2"
            :y="cy(r)"
            class="clue-text"
            :class="`clue-${rStatus(r)}`"
            dominant-baseline="central"
            text-anchor="middle"
          >{{ clue }}</text>
        </template>

        <!-- Col clues (top) -->
        <template v-for="(clue, c) in state.colClues" :key="`cc-${c}`">
          <text
            :x="cx(c)"
            :y="CLUE_W / 2"
            class="clue-text"
            :class="`clue-${cStatus(c)}`"
            dominant-baseline="central"
            text-anchor="middle"
          >{{ clue }}</text>
        </template>
      </svg>
    </div>

    <p class="hint-text">Clic para ciclar: vacío → 0 → 1 → vacío</p>

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
.toggle {
  max-width: 680px;
  margin: 0 auto;
  padding: 28px 24px 60px;
}

/* ── Header ── */
.game-header {
  display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;
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
.moves-pill  {
  background: var(--surface-2); border: 1px solid var(--border);
  padding: 4px 12px; border-radius: 20px; font-size: 12px; color: var(--muted);
}

/* ── Rules ── */
.rules-row {
  list-style: none; display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;
}
.rules-row li {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 5px 12px;
  font-size: 12px; color: var(--muted);
}

/* ── Controls ── */
.controls { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
.control-group { display: flex; align-items: center; gap: 10px; }
.control-label { font-size: 12px; color: var(--muted); width: 44px; flex-shrink: 0; }
.btn-row { display: flex; gap: 6px; flex-wrap: wrap; }

.action-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }

/* ── Loading ── */
.loading-box {
  display: flex; align-items: center; gap: 12px;
  padding: 32px; color: var(--muted); font-size: 14px;
}
.spinner {
  width: 20px; height: 20px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--accent);
  animation: spin 0.7s linear infinite; flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Board ── */
.board-wrap { margin-bottom: 12px; overflow-x: auto; }
.board-svg  { display: block; cursor: default; }

.grid-line { stroke: var(--border); stroke-width: 1; }

.cell-rect {
  cursor: pointer;
  transition: fill 0.1s;
}
.cell-empty { fill: var(--surface); }
.cell-empty:hover { fill: color-mix(in srgb, var(--accent) 10%, var(--surface)); }
.cell-given-zero { fill: color-mix(in srgb, #000da0 60%, var(--surface)); }
.cell-zero  { fill: color-mix(in srgb, #5865f2 12%, var(--surface)); }
.cell-zero:hover { fill: color-mix(in srgb, #5865f2 20%, var(--surface)); }
.cell-given-one { fill: color-mix(in srgb, #ff7300 60%, var(--surface)); }
.cell-one   { fill: color-mix(in srgb, #df8a45 12%, var(--surface)); }
.cell-one:hover { fill: color-mix(in srgb, #df8a45 20%, var(--surface)); }

.cell-value {
  font-family: var(--font-mono, monospace);
  font-size: 20px;
  font-weight: 700;
  pointer-events: none;
}
.given-zero { fill: #0e20ee; }
.given-one { fill: #ec720d; }
.value-zero  { fill: #5865f2; }
.value-one   { fill: #df8a45; }

/* ── Clues ── */
.clue-text {
  font-family: var(--font-mono, monospace);
  font-size: 13px;
  font-weight: 700;
  fill: var(--muted);
  transition: fill 0.15s;
}
.clue-ok          { fill: #2e7d4f; }
.clue-impossible  { fill: #e53e3e; }
.clue-partial     { fill: var(--muted); }

/* ── Hint ── */
.hint-text { font-size: 12px; color: var(--muted); margin-bottom: 20px; }

/* ── Buttons ── */
.btn {
  padding: 10px 20px; border-radius: var(--radius-md); border: none;
  font-family: var(--font-sans); font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all var(--transition);
}
.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:hover { background: var(--accent-h); }
.btn-ghost { background: var(--surface); border: 1px solid var(--border); color: var(--text); }
.btn-ghost:hover { border-color: var(--accent); }
.btn-ghost.active {
  border-color: var(--accent); color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
}
.btn-sm { padding: 7px 14px; font-size: 12px; }

/* ── Result ── */
.result-box {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 32px;
  text-align: center; animation: fadeIn 0.4s ease;
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } }
.result-emoji { font-size: 44px; margin-bottom: 12px; }
.result-title { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
.result-sub   { color: var(--muted); margin-bottom: 20px; }

@media (max-width: 480px) {
  .board-wrap { overflow-x: auto; }
}
</style>