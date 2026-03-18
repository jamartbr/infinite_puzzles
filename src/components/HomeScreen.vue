<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGameStore } from '@/store'
import type { GameMeta, GameId } from '@/types'

const router = useRouter()
const store  = useGameStore()

const GAMES: GameMeta[] = [
  {
    id: 'queens',
    title: 'Queens',
    emoji: '👑',
    description: 'Coloca una reina en cada región de color sin que se ataquen entre sí.',
    difficulty: 3,
    tags: ['lógica', 'estrategia'],
  },
  {
    id: 'zip',
    title: 'Zip',
    emoji: '⚡',
    description: 'Traza un camino que pase por todos los números en orden, llenando el tablero entero.',
    difficulty: 3,
    tags: ['caminos', 'rompecabezas'],
  },
  {
    id: 'slant',
    title: 'Slant',
    emoji: '❖',
    description: 'Rellena cada celda con líneas diagonales, de forma que los círculos toquen el número de líneas que indican y no se formen ciclos.',
    difficulty: 3,
    tags: ['caminos', 'rompecabezas'],
  },
]

const CARD_ACCENT: Record<GameId, string> = {
  queens:   '#eb459e',
  zip:      '#3ba55c',
  slant:    '#4287f5'
}

function winRate(id: GameId): string {
  const rate = store.winRateByGame.get(id)
  return rate !== undefined ? `${rate}% victorias` : 'Sin partidas'
}
</script>

<template>
  <div class="home">
    <div class="hero">
      <h1>Minijuegos de puzzles, cuando quieras</h1>
      <p class="hero-sub">
        Genera nuevos puzzles sin esperar al día siguiente.
      </p>
    </div>

    <div class="games-grid">
      <article
        v-for="game in GAMES"
        :key="game.id"
        class="game-card"
        :style="{ '--card-accent': CARD_ACCENT[game.id] }"
        @click="router.push(`/${game.id}`)"
      >
        <span class="card-emoji">{{ game.emoji }}</span>
        <h2 class="card-title">{{ game.title }}</h2>
        <p class="card-desc">{{ game.description }}</p>
        <div class="card-footer">
          <div class="tags">
            <span v-for="tag in game.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <span class="win-rate">{{ winRate(game.id) }}</span>
        </div>
        <div class="difficulty">
          <span
            v-for="i in 3"
            :key="i"
            class="dot"
            :class="{ filled: i <= game.difficulty }"
          />
        </div>
      </article>
    </div>

    <p v-if="store.totalGamesPlayed > 0" class="stats-line">
      {{ store.totalGamesPlayed }} partidas jugadas en total
    </p>
  </div>
</template>

<style scoped>
.home {
  max-width: 860px;
  margin: 0 auto;
  padding: 60px 24px 80px;
}

.hero {
  margin-bottom: 52px;
}

.hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(88 101 242 / 0.12);
  border: 1px solid rgba(88 101 242 / 0.3);
  color: #818cf8;
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 13px;
  margin-bottom: 20px;
}

h1 {
  font-size: clamp(32px, 6vw, 58px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin-bottom: 16px;
}
h1 em { font-style: normal; color: #5865f2; }

.hero-sub {
  font-size: 17px;
  color: var(--muted);
  max-width: 460px;
  line-height: 1.6;
}

/* Grid */
.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 18px;
  margin-bottom: 32px;
}

.game-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 26px;
  cursor: pointer;
  transition: all 0.22s ease;
  position: relative;
  overflow: hidden;
}
.game-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--card-accent) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}
.game-card:hover {
  border-color: var(--card-accent);
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0 0 0 / 0.3);
}
.game-card:hover::after { opacity: 0.06; }

.card-emoji { font-size: 34px; display: block; margin-bottom: 14px; }
.card-title { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
.card-desc  { font-size: 13px; color: var(--muted); line-height: 1.55; margin-bottom: 16px; }

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.tags { display: flex; gap: 6px; flex-wrap: wrap; }
.tag  {
  background: rgba(255 255 255 / 0.06);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--muted);
}
.win-rate { font-size: 11px; color: var(--subtle); white-space: nowrap; }

.difficulty {
  display: flex;
  gap: 5px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border-2);
  transition: background var(--transition);
}
.dot.filled { background: var(--card-accent); }

.stats-line {
  text-align: center;
  font-size: 13px;
  color: var(--subtle);
}
</style>
