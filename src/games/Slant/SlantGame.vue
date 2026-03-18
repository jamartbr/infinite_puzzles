<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/store'
import {
  createSlantPuzzle,
  isValidSlantState,
} from './slant.logic'
import type { SlantState, SlantCell } from './slant.types'

const router    = useRouter()
const store     = useGameStore()

// ── Constants ─────────────────────────────────────────────────────────────
const CELL   = 58   // px per cell
const MARGIN = 22   // px around board for clue circles
const CLUE_R = 10   // radius of clue vertex circles
const PAD    = 5    // inset from cell corner for diagonal endpoints

// ── State ─────────────────────────────────────────────────────────────────
const state      = ref<SlantState>(createSlantPuzzle(6))
const startedAt  = ref(Date.now())
const showErrors = ref(true)

// ── Derived ───────────────────────────────────────────────────────────────
const svgSize = computed(() => MARGIN * 2 + state.value.size * CELL)

const filledCount = computed(() => {
  let n = 0
  for (const row of state.value.board)
    for (const cell of row)
      if (cell !== null) n++
  return n
})

const totalCells = computed(() => state.value.size * state.value.size)

// ── Helpers ───────────────────────────────────────────────────────────────
function countAtVertex(vy: number, vx: number): number {
  const b = state.value.board
  const s = state.value.size
  let count = 0
  if (vy > 0 && vx > 0 && b[vy - 1][vx - 1] === '\\') count++
  if (vy > 0 && vx < s && b[vy - 1][vx]     === '/')  count++
  if (vy < s && vx > 0 && b[vy][vx - 1]     === '/')  count++
  if (vy < s && vx < s && b[vy][vx]          === '\\') count++
  return count
}

function adjCells(vy: number, vx: number) {
  const b = state.value.board
  const s = state.value.size
  return [
    vy > 0 && vx > 0 ? b[vy - 1][vx - 1] : null,
    vy > 0 && vx < s ? b[vy - 1][vx]     : null,
    vy < s && vx > 0 ? b[vy][vx - 1]     : null,
    vy < s && vx < s ? b[vy][vx]          : null,
  ]
}

function diagonalCoords(y: number, x: number, cell: SlantCell | null) {
  const x0 = MARGIN + x * CELL
  const y0 = MARGIN + y * CELL
  return cell === '\\'
    ? { x1: x0 + PAD, y1: y0 + PAD, x2: x0 + CELL - PAD, y2: y0 + CELL - PAD }
    : { x1: x0 + CELL - PAD, y1: y0 + PAD, x2: x0 + PAD, y2: y0 + CELL - PAD }
}

// ── Error detection ───────────────────────────────────────────────────────
// Returns the set of cell keys (y*100+x) whose diagonal is part of a cycle.
//
// Algorithm: build a vertex-degree map, then repeatedly prune degree-1
// vertices (they can only be tree tails, never cycle members). Whatever
// remains after pruning has every vertex at degree ≥ 2 — those are exactly
// the cycle edges. This correctly excludes "lollipop" tails that touch a
// cycle without being part of it.
function cyclingCells(): Set<number> {
  const board = state.value.board
  const s     = state.value.size
  const vkey  = (vy: number, vx: number) => vy * (s + 1) + vx
 
  function endpoints(y: number, x: number): [number, number] {
    return board[y][x] === '\\'
      ? [vkey(y, x),     vkey(y + 1, x + 1)]
      : [vkey(y, x + 1), vkey(y + 1, x)    ]
  }
 
  // Build adjacency: vertex -> set of neighbour vertices
  const adj = new Map<number, Set<number>>()
  const edgeOf = new Map<string, number>() // "vA,vB" -> cell key
 
  function addEdge(va: number, vb: number, ck: number) {
    if (!adj.has(va)) adj.set(va, new Set())
    if (!adj.has(vb)) adj.set(vb, new Set())
    adj.get(va)!.add(vb)
    adj.get(vb)!.add(va)
    const ekey = va < vb ? `${va},${vb}` : `${vb},${va}`
    edgeOf.set(ekey, ck)
  }
 
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (board[y][x] !== '/' && board[y][x] !== '\\') continue
      const [va, vb] = endpoints(y, x)
      addEdge(va, vb, y * 100 + x)
    }
  }
 
  // Prune degree-1 vertices until none remain
  const queue: number[] = []
  for (const [v, neighbours] of adj) {
    if (neighbours.size === 1) queue.push(v)
  }
 
  while (queue.length > 0) {
    const v = queue.pop()!
    const neighbours = adj.get(v)
    if (!neighbours || neighbours.size !== 1) continue
    const u = [...neighbours][0]
    adj.delete(v)
    const uNeighbours = adj.get(u)
    if (uNeighbours) {
      uNeighbours.delete(v)
      if (uNeighbours.size === 1) queue.push(u)
    }
  }
 
  // Remaining edges (both endpoints still in adj) are cycle members
  const inCycle = new Set<number>()
  for (const [ekey, ck] of edgeOf) {
    const [a, b] = ekey.split(',').map(Number)
    if (adj.has(a) && adj.has(b)) {
      inCycle.add(ck)
    }
  }
 
  return inCycle
}
 
function isErrorCell(y: number, x: number): boolean {
    if (!showErrors.value) return false
    if (!state.value.board[y][x]) return false
    
    // Check if cell is part of a cycle
    if (cyclingCells().has(y * 100 + x)) return true
    
    // Check if any of the 4 adjacent vertices has a violated clue
    const s = state.value.size
    const vertices = [
        [y, x],
        [y, x + 1],
        [y + 1, x],
        [y + 1, x + 1],
    ]
    
    for (const [vy, vx] of vertices) {
        if (vy >= 0 && vy <= s && vx >= 0 && vx <= s) {
            if (clueCircleClass(vy, vx) === 'clue-violated') return true
        }
    }
    
    return false
}

// ── Clue circle state ─────────────────────────────────────────────────────
function clueCircleClass(vy: number, vx: number): string {
    if (state.value.status === 'won') return 'clue-satisfied'
    if (!showErrors.value) return ' '
    const clue = state.value.clues[vy][vx]
    if (clue === null) return ' '
    const cells = adjCells(vy, vx)
    const filledCount = countAtVertex(vy, vx)
    const emptyCount = cells.filter(c => c === ' ').length

    // Si hay celdas vacías alrededor
    if (emptyCount > 0) {
        // Si ya hemos excedido el clue
        if (filledCount > clue) return 'clue-violated'
        // Si no podemos alcanzar el clue aunque llenemos todas las vacías
        if (filledCount + emptyCount < clue) return 'clue-violated'
        return ''
    }

    // Si todas las celdas están llenas
    return filledCount === clue ? 'clue-satisfied' : 'clue-violated'
}

// ── Actions ───────────────────────────────────────────────────────────────
function clickCell(y: number, x: number) {
  if (state.value.status === 'won') return

  const cur = state.value.board[y][x]
  const next: SlantCell =
    cur === ' ' ? '/' : cur === '/' ? '\\' : ' '

  state.value.board[y] = [...state.value.board[y]]
  state.value.board[y][x] = next
  state.value.moves++
  state.value.status = 'playing'

  if (isValidSlantState(state.value, state.value.clues)) {
    state.value.status = 'won'
    store.recordResult({
      gameId: 'slant',
      won: true,
      score: Math.max(1, 100 - state.value.moves),
      durationMs: Date.now() - startedAt.value,
      timestamp: Date.now(),
    })
  }
}

function resetBoard() {
  const s = state.value.size
  state.value.board = Array.from({ length: s }, () => Array(s).fill(' '))
  state.value.moves  = 0
  state.value.status = 'idle'
}

function newGame() {
  state.value     = createSlantPuzzle(6)
  startedAt.value = Date.now()
}
</script>

<template>
  <div class="slant">
    <!-- Header -->
    <header class="game-header">
      <button class="back-btn" @click="router.push('/')">← Volver</button>
      <div class="header-meta">
        <span class="game-title">╱ Slant</span>
        <span class="moves-pill">
          {{ filledCount }}/{{ totalCells }} celdas · {{ state.moves }} movimientos
        </span>
      </div>
    </header>

    <!-- Rules -->
    <ul class="rules-row">
      <li>Rellena cada celda con / o \</li>
      <li>El número en cada vértice indica cuántas diagonales lo tocan</li>
      <li>Las líneas no pueden formar ciclos cerrados</li>
    </ul>

    <!-- Controls -->
    <div class="mode-row">
      <button class="btn btn-ghost btn-sm" @click="resetBoard">↩ Reiniciar</button>
      <button class="btn btn-ghost btn-sm" @click="newGame">🔄 Nuevo tablero</button>
      <button class="btn btn-ghost btn-sm" :class="{ active: showErrors }" @click="showErrors = !showErrors">
        {{ showErrors ? '👁 Ocultar errores' : '👁 Mostrar errores' }}
      </button>
    </div>

    <!-- Board -->
    <div class="board-container">
      <svg
        :width="svgSize"
        :height="svgSize"
        :viewBox="`0 0 ${svgSize} ${svgSize}`"
        class="slant-svg"
      >
        <!-- Click targets + cell backgrounds -->
        <template v-for="(row, y) in state.board" :key="`row-${y}`">
          <rect
            v-for="(_, x) in row"
            :key="`cell-${y}-${x}`"
            :x="MARGIN + x * CELL"
            :y="MARGIN + y * CELL"
            :width="CELL"
            :height="CELL"
            class="cell-bg"
            :class="{
              'cell-filled': state.board[y][x] !== null,
              'cell-error':  isErrorCell(y, x),
            }"
            @click="clickCell(y, x)"
          />
        </template>

        <!-- Grid lines -->
        <line
          v-for="i in state.size + 1"
          :key="`h-${i}`"
          :x1="MARGIN"
          :y1="MARGIN + (i - 1) * CELL"
          :x2="MARGIN + state.size * CELL"
          :y2="MARGIN + (i - 1) * CELL"
          class="grid-line"
        />
        <line
          v-for="i in state.size + 1"
          :key="`v-${i}`"
          :x1="MARGIN + (i - 1) * CELL"
          :y1="MARGIN"
          :x2="MARGIN + (i - 1) * CELL"
          :y2="MARGIN + state.size * CELL"
          class="grid-line"
        />

        <!-- Diagonals -->
        <template v-for="(row, y) in state.board" :key="`drow-${y}`">
          <template v-for="(cell, x) in row" :key="`diag-${y}-${x}`">
            <line
              v-if="cell !== ' '"
              v-bind="diagonalCoords(y, x, cell)"
              class="diagonal-line"
              :class="{ 'diag-error': isErrorCell(y, x) }"
            />
          </template>
        </template>

        <!-- Clue vertices -->
        <template v-for="(clueRow, vy) in state.clues" :key="`crow-${vy}`">
          <template v-for="(clue, vx) in clueRow" :key="`clue-${vy}-${vx}`">
            <g
              v-if="clue !== null"
              :transform="`translate(${MARGIN + vx * CELL}, ${MARGIN + vy * CELL})`"
              class="clue-group"
            >
              <circle :r="CLUE_R" class="clue-circle" :class="clueCircleClass(vy, vx)" />
              <text class="clue-text" text-anchor="middle" dominant-baseline="central">
                {{ clue }}
              </text>
            </g>
          </template>
        </template>
      </svg>
    </div>

    <p class="hint-text">Clic para ciclar: vacío → ╱ → ╲ → vacío</p>

    <!-- Win result box -->
    <div v-if="state.status === 'won'" class="result-box">
      <p class="result-emoji">╱</p>
      <p class="result-title">¡Puzzle resuelto!</p>
      <p class="result-sub">Lo lograste en {{ state.moves }} movimientos.</p>
      <button class="btn btn-primary" @click="newGame">Nuevo tablero</button>
    </div>
  </div>
</template>

<style scoped>
.slant {
  max-width: 680px;
  margin: 0 auto;
  padding: 28px 24px 60px;
}

/* ── Header ── */
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
  cursor: pointer;
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

/* ── Rules ── */
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

/* ── Controls row ── */
.mode-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

/* ── Board ── */
.board-container {
  width: fit-content;
  margin-bottom: 12px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--border);
}

.slant-svg {
  display: block;
  cursor: crosshair;
  background: var(--surface);
}

.grid-line {
  stroke: var(--border);
  stroke-width: 1;
}

.cell-bg {
  fill: transparent;
  stroke: none;
  cursor: pointer;
  transition: fill var(--transition);
}
.cell-bg:hover       { fill: color-mix(in srgb, var(--accent) 8%,  transparent); }
/* .cell-bg.cell-filled { fill: color-mix(in srgb, var(--accent) 5%,  transparent); } */
/* .cell-bg.cell-error  { fill: color-mix(in srgb, var(--accent) 15%, transparent); } */

.diagonal-line {
  stroke: var(--text);
  stroke-width: 2.5;
  stroke-linecap: round;
  pointer-events: none;
  transition: stroke var(--transition);
}
.diagonal-line.diag-error { stroke: #ac1a1a; }

/* Clue vertices */
.clue-group { pointer-events: none; }
.clue-circle {
  fill: var(--surface-2);
  stroke: var(--border);
  stroke-width: 1.5;
  transition: fill var(--transition), stroke var(--transition);
}
.clue-circle.clue-satisfied { fill: #2e7d4f; stroke: #2e7d4f; }
.clue-circle.clue-violated  { fill: #ac1a1a; stroke: #ac1a1a; }

.clue-text {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  fill: var(--text);
  transition: fill var(--transition);
}
.clue-group:has(.clue-satisfied) .clue-text,
.clue-group:has(.clue-violated)  .clue-text { fill: #ffffff; }

/* ── Hint ── */
.hint-text {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 20px;
}

/* ── Buttons ── */
.btn {
  padding: 10px 20px;
  border-radius: var(--radius-md);
  border: none;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  transition: all var(--transition);
  cursor: pointer;
}
.btn-primary       { background: var(--accent); color: #fff; }
.btn-primary:hover { background: var(--accent-h); }
.btn-ghost {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
}
.btn-ghost:hover  { border-color: var(--accent); }
.btn-ghost.active { border-color: var(--accent); color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }
.btn-sm { padding: 7px 14px; font-size: 12px; }

/* ── Result box ── */
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
  .board-container { overflow-x: auto; }
}
</style>