<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/store'
import {
  createTetonorState,
  evaluateEntry,
  validateTetonor,
  getEntry,
  emptyEntry,
} from './tetonor.logic'
import type { TetonorState, TetonorEntry, TetonorOp } from './tetonor.types'

const router    = useRouter()
const store     = useGameStore()

// ── State ─────────────────────────────────────────────────────────────────
const state     = ref<TetonorState>(createTetonorState())
const startedAt = ref(Date.now())

// ── Derived ───────────────────────────────────────────────────────────────
const solvedCount = computed(() => {
  let n = 0
  for (const row of state.value.grid)
    for (const cell of row)
      if (evaluateEntry(getEntry(state.value.entries, cell.id), cell.target)) n++
  return n
})

const totalCells = computed(() => state.value.grid.length ** 2)

// ── Entry access (reactive wrapper) ──────────────────────────────────────
function entryFor(cellId: string): TetonorEntry {
  if (!state.value.entries.has(cellId))
    state.value.entries.set(cellId, emptyEntry())
  return state.value.entries.get(cellId)!
}

function cellStatus(cellId: string, target: number): 'empty' | 'correct' | 'wrong' {
  const e = entryFor(cellId)
  if (!e.left && !e.right && !e.op) return 'empty'
  return evaluateEntry(e, target) ? 'correct' : 'wrong'
}

// ── Input handlers ────────────────────────────────────────────────────────
function onInput(cellId: string) {
  state.value.moves++
  state.value.status = 'playing'
  checkWin()
}

function setOp(cellId: string, op: TetonorOp) {
  entryFor(cellId).op = entryFor(cellId).op === op ? null : op
  state.value.moves++
  state.value.status = 'playing'
  checkWin()
}

function checkWin() {
  if (validateTetonor(state.value)) {
    state.value.status = 'won'
    store.recordResult({
      gameId: 'tetonor',
      won: true,
      score: Math.max(1, 100 - state.value.moves),
      durationMs: Date.now() - startedAt.value,
      timestamp: Date.now(),
    })
  }
}

// ── Actions ───────────────────────────────────────────────────────────────
function resetGame() {
  state.value.entries = new Map()
  state.value.moves   = 0
  state.value.status  = 'idle'
}

function newGame() {
  state.value   = createTetonorState()
  startedAt.value = Date.now()
}
</script>

<template>
  <div class="tetonor">
    <!-- Header -->
    <header class="game-header">
      <button class="back-btn" @click="router.push('/')">← Volver</button>
      <div class="header-meta">
        <span class="game-title">✕ Tetonor</span>
        <span class="moves-pill">
          {{ solvedCount }}/{{ totalCells }} resueltas · {{ state.moves }} movimientos
        </span>
      </div>
    </header>

    <!-- Rules -->
    <ul class="rules-row">
      <li>Cada par de la tira aparece una vez como suma y otra como producto</li>
      <li>Los valores en blanco deben deducirse</li>
      <li>Todos los números deben usarse exactamente las veces que aparecen</li>
    </ul>

    <!-- Controls -->
    <div class="mode-row">
      <button class="btn btn-ghost btn-sm" @click="resetGame">↩ Reiniciar</button>
      <button class="btn btn-ghost btn-sm" @click="newGame">🔄 Nuevo tablero</button>
    </div>

    <!-- 4×4 Grid -->
    <div class="grid">
      <div
        v-for="(row, r) in state.grid"
        :key="`row-${r}`"
        class="grid-row"
      >
        <div
          v-for="cell in row"
          :key="cell.id"
          class="grid-cell"
          :class="cellStatus(cell.id, cell.target)"
        >
          <!-- Target number -->
          <div class="cell-target">{{ cell.target }}</div>

          <!-- Entry row: left operand · operator toggle · right operand -->
          <div class="cell-entry">
            <input
              class="operand-input"
              type="number"
              min="1"
              :value="entryFor(cell.id).left"
              @input="e => { entryFor(cell.id).left = (e.target as HTMLInputElement).value; onInput(cell.id) }"
              placeholder="?"
            />

            <div class="op-toggle">
              <button
                class="op-btn"
                :class="{ active: entryFor(cell.id).op === '+' }"
                @click="setOp(cell.id, '+')"
              >+</button>
              <button
                class="op-btn"
                :class="{ active: entryFor(cell.id).op === '×' }"
                @click="setOp(cell.id, '×')"
              >×</button>
            </div>

            <input
              class="operand-input"
              type="number"
              min="1"
              :value="entryFor(cell.id).right"
              @input="e => { entryFor(cell.id).right = (e.target as HTMLInputElement).value; onInput(cell.id) }"
              placeholder="?"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Strip -->
    <div class="strip-section">
      <div class="strip-label">Tira de operandos</div>
      <div class="strip">
        <div
          v-for="(slot, i) in state.strip"
          :key="`slot-${i}`"
          class="strip-slot"
          :class="{ hidden: slot.hidden }"
        >
          <span v-if="!slot.hidden">{{ slot.value }}</span>
          <span v-else class="blank">?</span>
        </div>
      </div>
    </div>

    <p class="hint-text">
      Introduce dos operandos y selecciona + o × para alcanzar cada resultado
    </p>

    <!-- Win result box -->
    <div v-if="state.status === 'won'" class="result-box">
      <p class="result-emoji">✕</p>
      <p class="result-title">¡Puzzle resuelto!</p>
      <p class="result-sub">Lo lograste en {{ state.moves }} movimientos.</p>
      <button class="btn btn-primary" @click="newGame">Nuevo tablero</button>
    </div>
  </div>
</template>

<style scoped>
.tetonor {
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
  cursor: pointer;
  transition: all var(--transition);
}
.back-btn:hover { border-color: var(--text); color: var(--text); }
.header-meta    { display: flex; justify-content: space-between; align-items: center; }
.game-title     { font-size: 24px; font-weight: 700; }
.moves-pill {
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

/* ── Controls ── */
.mode-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

/* ── Grid ── */
.grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 28px;
  width: fit-content;
}

.grid-row {
  display: flex;
  gap: 8px;
}

.grid-cell {
  width: 136px;
  padding: 10px 10px 8px;
  border-radius: var(--radius-md);
  border: 2px solid var(--border);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color var(--transition), background var(--transition);
}

.grid-cell.correct {
  border-color: #2e7d4f;
  background: color-mix(in srgb, #2e7d4f 8%, var(--surface));
}
.grid-cell.wrong {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, var(--surface));
}

.cell-target {
  font-size: 22px;
  font-weight: 700;
  text-align: center;
  color: var(--text);
  line-height: 1;
}

/* ── Entry row ── */
.cell-entry {
  display: flex;
  align-items: center;
  gap: 4px;
}

.operand-input {
  width: 36px;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  padding: 0;
  /* Hide number input arrows */
  -moz-appearance: textfield;
  appearance: textfield;
  transition: border-color var(--transition);
}
.operand-input::-webkit-inner-spin-button,
.operand-input::-webkit-outer-spin-button { display: none; }
.operand-input:focus {
  outline: none;
  border-color: var(--accent);
}
.operand-input::placeholder { color: var(--muted); font-weight: 400; }

.op-toggle {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.op-btn {
  width: 22px;
  height: 13px;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
  padding: 0;
  line-height: 1;
}
.op-btn:hover  { border-color: var(--accent); color: var(--accent); }
.op-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

/* ── Strip ── */
.strip-section {
  margin-bottom: 12px;
}

.strip-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
}

.strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.strip-slot {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.strip-slot.hidden {
  background: var(--surface-2);
  border-style: dashed;
}

.blank {
  color: var(--muted);
  font-weight: 400;
}

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
  cursor: pointer;
  transition: all var(--transition);
}
.btn-primary       { background: var(--accent); color: #fff; }
.btn-primary:hover { background: var(--accent-h); }
.btn-ghost {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
}
.btn-ghost:hover { border-color: var(--accent); }
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

/* ── Responsive ── */
@media (max-width: 600px) {
  .grid-cell    { width: 110px; }
  .cell-target  { font-size: 18px; }
  .operand-input { width: 30px; }
}

@media (max-width: 480px) {
  .grid-cell   { width: 80px; padding: 8px 6px; }
  .cell-target { font-size: 16px; }
  .op-btn      { width: 18px; }
}
</style>