<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/store'
import {
  createLoopyState,
  toggleEdge,
  cellInfo,
  progressCount,
  edgeKey,
} from './loopy.logic'
import type { LoopyState, EdgeKey } from './loopy.types'

const router    = useRouter()
const store     = useGameStore()
const startedAt = ref(Date.now())
const level     = ref(0)

const LEVELS = [
  { value: 0, label: '🟢 Fácil' },
  { value: 1, label: '🟡 Medio' },
  { value: 2, label: '🔴 Difícil' },
]

// ── Estado ────────────────────────────────────────────────────────────────
const props = defineProps<{
  initialState: LoopyState
  daily?: boolean
}>()
const emit = defineEmits<{
  'update:state': [state: LoopyState]
  'win': []
}>()

const loading = ref(false)  // no longer starts as true
const state = ref<LoopyState>(props.initialState) 

function startGeneration(sz: number, lv: number) {
  loading.value = true
  // Defer para que Vue renderice el spinner antes del trabajo síncrono pesado
  setTimeout(() => {
    state.value   = createLoopyState(sz, lv)
    loading.value = false
    startedAt.value = Date.now()
    emit('update:state', state.value)
  }, 30)
}

// ── Derivados ─────────────────────────────────────────────────────────────
const progress = computed(() =>
  state.value ? progressCount(state.value) : { correct: 0, total: 0 }
)

function edgeState(key: EdgeKey): 'unknown' | 'on' | 'off' {
  return state.value?.edges.get(key) ?? 'unknown'
}

function clueAt(r: number, c: number): number | null {
  return state.value?.clues[r][c] ?? null
}

/** Color de feedback de la celda según si su cuenta ON coincide con la pista */
function cellFeedback(r: number, c: number): 'ok' | 'over' | 'under' | 'none' {
  if (!state.value) return 'none'
  const info = cellInfo(state.value, r, c)
  if (info.clue === null) return 'none'
  if (info.on === info.clue) return 'ok'
  if (info.on > info.clue)  return 'over'
  return 'none'   // "under" solo si no quedan unknowns
}

// ── Acciones ──────────────────────────────────────────────────────────────
function checkWin(state: LoopyState): boolean {
  for (const [key, edgeState] of state.edges) {
    const inSol = state.solution.has(key)
    if (inSol  && edgeState !== 'on')  return false
    if (!inSol && edgeState === 'on')  return false
  }
  return true
}

function onEdgeClick(key: EdgeKey) {
  if (!state.value || state.value.status === 'won') return
  toggleEdge(state.value, key)
  state.value.status = 'playing'
  if (checkWin(state.value)) {
    state.value.status = 'won'
    if (!props.daily) {
        store.recordResult({
        gameId:     'loopy',
        won:        true,
        score:      Math.max(1, 200 - progress.value.correct),
        durationMs: Date.now() - startedAt.value,
        timestamp:  Date.now(),
        })
    }
    emit('win')
    emit('update:state', state.value)
  }
}

function resetGame() {
  if (!state.value) return
  for (const key of state.value.edges.keys())
    state.value.edges.set(key, 'unknown')
  state.value.status = 'idle'
}

function newGame() {
  startGeneration(5, level.value)
}

function onLevelChange(lv: number) {
  level.value = lv
  startGeneration(5, lv)
}

// ── Helpers de layout ─────────────────────────────────────────────────────
// El tablero se renderiza como SVG para control total del layout.
// n celdas → (n+1) vértices por lado
// Cada celda tiene tamaño CELL_SIZE px, con PADDING alrededor
const CELL  = 60
const PAD   = 24
const n     = computed(() => state.value?.size ?? 5)
const svgW  = computed(() => n.value * CELL + PAD * 2)
const svgH  = computed(() => n.value * CELL + PAD * 2)

function vx(c: number) { return PAD + c * CELL }   // x del vértice columna c
function vy(r: number) { return PAD + r * CELL }   // y del vértice fila r

// Aristas horizontales: entre (r,c)-(r,c+1) para r∈[0,n], c∈[0,n-1]
const hEdges = computed(() => {
  if (!state.value) return []
  const res = []
  for (let r = 0; r <= n.value; r++)
    for (let c = 0; c < n.value; c++)
      res.push({ key: edgeKey(r,c,r,c+1), r, c })
  return res
})

// Aristas verticales: entre (r,c)-(r+1,c) para r∈[0,n-1], c∈[0,n]
const vEdges = computed(() => {
  if (!state.value) return []
  const res = []
  for (let r = 0; r < n.value; r++)
    for (let c = 0; c <= n.value; c++)
      res.push({ key: edgeKey(r,c,r+1,c), r, c })
  return res
})
</script>

<template>
  <div class="loopy">
    <!-- Header -->
    <header class="game-header">
      <button class="back-btn" @click="router.push('/')">← Volver</button>
      <div class="header-meta">
        <span class="game-title">🌀 Loopy</span>
        <span class="steps-pill">{{ progress.correct }}/{{ progress.total }} aristas</span>
      </div>
    </header>

    <p class="loopy-info">
      Dibuja un bucle cerrado. Cada número indica cuántas de las aristas
      que rodean esa celda forman parte del bucle.
    </p>

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

    <!-- Spinner mientras genera -->
    <div v-if="loading" class="loading-box">
      <span class="spinner" />
      <span>Generando puzzle único…</span>
    </div>

    <!-- Tablero SVG -->
    <div v-else-if="state" class="board-wrap">
      <svg
        :width="svgW"
        :height="svgH"
        class="board-svg"
        :viewBox="`0 0 ${svgW} ${svgH}`"
      >
        <!-- Fondo de celdas con feedback de pista -->
        <template v-for="r in n" :key="`cell-${r}`">
          <rect
            v-for="c in n"
            :key="`cell-${r}-${c}`"
            :x="vx(c-1) + 2"
            :y="vy(r-1) + 2"
            :width="CELL - 4"
            :height="CELL - 4"
            rx="6"
            :class="`cell-bg cell-${cellFeedback(r-1, c-1)}`"
          />
        </template>

        <!-- Números de pista -->
        <template v-for="r in n" :key="`clue-${r}`">
          <template v-for="c in n" :key="`clue-${r}-${c}`">
            <text
              v-if="clueAt(r-1, c-1) !== null"
              :x="vx(c-1) + CELL/2"
              :y="vy(r-1) + CELL/2"
              class="clue-text"
              :class="`clue-${cellFeedback(r-1, c-1)}`"
              dominant-baseline="central"
              text-anchor="middle"
            >{{ clueAt(r-1, c-1) }}</text>
          </template>
        </template>

        <!-- Aristas horizontales -->
        <line
          v-for="e in hEdges"
          :key="e.key"
          :x1="vx(e.c)"      :y1="vy(e.r)"
          :x2="vx(e.c + 1)"  :y2="vy(e.r)"
          :class="`edge edge-${edgeState(e.key)}`"
          @click="onEdgeClick(e.key)"
        />

        <!-- Aristas verticales -->
        <line
          v-for="e in vEdges"
          :key="e.key"
          :x1="vx(e.c)"  :y1="vy(e.r)"
          :x2="vx(e.c)"  :y2="vy(e.r + 1)"
          :class="`edge edge-${edgeState(e.key)}`"
          @click="onEdgeClick(e.key)"
        />

        <!-- Vértices (puntos de intersección) -->
        <template v-for="r in (n + 1)" :key="`dots-${r}`">
          <circle
            v-for="c in (n + 1)"
            :key="`dot-${r}-${c}`"
            :cx="vx(c-1)"
            :cy="vy(r-1)"
            r="3"
            class="vertex"
          />
        </template>
      </svg>
    </div>

    <!-- Acciones -->
    <div class="action-row">
      <button class="btn btn-ghost btn-sm" @click="resetGame">↩ Reiniciar</button>
      <button v-if="!props.daily" class="btn btn-ghost btn-sm" @click="newGame">🔄 Nuevo tablero</button>
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
.loopy {
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
.steps-pill  {
  background: var(--surface-2); border: 1px solid var(--border);
  padding: 4px 12px; border-radius: 20px; font-size: 12px; color: var(--muted);
}
.loopy-info { font-size: 14px; color: var(--muted); line-height: 1.6; margin-bottom: 12px; }

/* ── Nivel ── */
.mode-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
.btn-ghost.active {
  border-color: var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
}

/* ── Loading ── */
.loading-box {
  display: flex; align-items: center; gap: 12px;
  padding: 32px; color: var(--muted); font-size: 14px;
}
.spinner {
  width: 20px; height: 20px; border-radius: 50%;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Tablero SVG ── */
.board-wrap { margin-bottom: 20px; overflow-x: auto; }
.board-svg  { display: block; }

/* Fondo de celdas */
:global(.cell-bg)    { fill: transparent; }
:global(.cell-ok)    { fill: color-mix(in srgb, #2e7d4f 12%, transparent); }
:global(.cell-over)  { fill: color-mix(in srgb, #e53e3e 10%, transparent); }

/* Texto de pista */
:global(.clue-text) {
  font-family: var(--font-mono, monospace);
  font-size: 18px;
  font-weight: 700;
  fill: var(--text);
}
:global(.clue-ok)   { fill: #2e7d4f; }
:global(.clue-over) { fill: #e53e3e; }

/* Aristas */
:global(.edge) {
  stroke-width: 6;
  stroke-linecap: round;
  cursor: pointer;
  transition: stroke 0.12s, stroke-dasharray 0.12s, opacity 0.12s;
}
:global(.edge-unknown) {
  stroke: var(--border, #444);
  opacity: 0.45;
  stroke-dasharray: none;
}
:global(.edge-unknown:hover) { opacity: 0.9; stroke: var(--accent, #7c5cfc); }
:global(.edge-on) {
  stroke: #7c5cfc;
  opacity: 1;
  stroke-dasharray: none;
}
:global(.edge-off) {
  stroke: #e53e3e;
  opacity: 0.55;
  stroke-dasharray: 3 5;
}

/* Vértices */
:global(.vertex) { fill: var(--muted, #888); opacity: 0.6; }

/* ── Acciones ── */
.action-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
.btn { padding: 10px 20px; border-radius: var(--radius-md); border: none; font-family: var(--font-sans); font-size: 14px; font-weight: 600; cursor: pointer; transition: all var(--transition); }
.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:hover { background: var(--accent-h); }
.btn-ghost { background: var(--surface); border: 1px solid var(--border); color: var(--text); }
.btn-ghost:hover { border-color: var(--accent); }
.btn-sm { padding: 7px 14px; font-size: 12px; }

/* ── Resultado ── */
.result-box {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 32px;
  text-align: center; animation: fadeIn 0.4s ease;
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } }
.result-emoji { font-size: 44px; margin-bottom: 12px; }
.result-title { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
.result-sub   { color: var(--muted); margin-bottom: 20px; }
</style>