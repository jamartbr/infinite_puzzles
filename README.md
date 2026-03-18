# 🎮 Infinite Puzzles

[![CI](https://github.com/jamartbr/infinite-puzzles/actions/workflows/ci.yml/badge.svg)](https://github.com/jamartbr/infinite-puzzles/actions/workflows/ci.yml)
[![Deploy](https://github.com/jamartbr/infinite-puzzles/actions/workflows/deploy.yml/badge.svg)](https://github.com/jamartbr/infinite-puzzles/actions/workflows/deploy.yml)
<!-- [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE) -->
[![Vue 3](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vue.js)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)

Versiones web de los minijuegos de puzles más populares, jugables de forma ilimitada. Genera puzzles nuevos cada vez mediante algoritmos procedurales.

---

## ✨ Juegos incluidos

| Juego | Descripción | Dificultad |
|-------|-------------|------------|
<!-- | 👑 **Queens** | Coloca una reina en cada región de color sin que se ataquen. Tableros generados proceduralmente. | ⭐⭐⭐ | -->
<!-- | ⚡ **Zip** | Traza un camino que pase por todos los números en orden llenando el tablero entero. | ⭐⭐⭐ | -->
| ❖ **Slant** | Rellena cada celda con / o \\, cumpliendo con las restricciones, sin formar ciclos cerrados. | ⭐⭐⭐ |

---

## 🚀 Inicio rápido

### Requisitos

- Node.js ≥ 18
- pnpm ≥ 8 (recomendado) o npm ≥ 9

### Instalación

```bash
git clone https://github.com/jamartbr/infinite-puzzles.git
cd infinite-puzzles
pnpm install
pnpm dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

### Otros comandos

```bash
pnpm build        # Compila para producción en dist/
pnpm preview      # Previsualiza el build de producción
pnpm test         # Ejecuta tests unitarios con Vitest
pnpm test:e2e     # Ejecuta tests e2e con Playwright
pnpm lint         # ESLint + Vue style check
pnpm type-check   # Verificación de tipos TypeScript
```

---

## 🏗️ Arquitectura

```
infinite-puzzles/
├── src/
│   ├── games/
│   │   └── Slant/             # Juego Slant
│   │       ├── SlantGame.vue
│   │       ├── slant.logic.ts      # Generador/validador de soluciones
│   │       └── slant.types.ts
│   ├── components/            # UI compartida
│   │   └── HomeScreen.vue
│   ├── composables/           # Lógica reutilizable (Vue Composition API)
│   │   ├── useScore.ts
│   │   ├── useTimer.ts
│   │   └── usePuzzleGenerator.ts
│   ├── router/
│   │   └── index.ts           # Vue Router — rutas por juego
│   ├── store/
│   │   └── index.ts           # Pinia — estado global (scores, preferencias)
│   ├── styles/
│   │   └── main.css           # Variables CSS globales + reset
│   ├── types/
│   │   └── index.ts           # Tipos compartidos entre juegos
│   ├── App.vue
│   └── main.ts
├── public/
│   └── puzzle.svg             # Favicon
├── tests/
│   ├── unit/                  # Vitest
│   └── e2e/                   # Playwright
├── .github/
│   ├── workflows/
│   │   ├── ci.yml             # Lint + test + build en cada PR
│   │   └── deploy.yml         # Deploy a GitHub Pages en merge a main
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.yml
│       └── feature_request.yml
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
└── tsconfig.node.json
```

---

## 🔧 Tecnologías

| Capa | Tecnología |
|------|-----------|
| Framework | Vue 3 (Composition API + `<script setup>`) |
| Build | Vite 5 |
| Lenguaje | TypeScript 5 |
| Estado | Pinia |
| Rutas | Vue Router 4 |
| Tests unitarios | Vitest |
| Tests e2e | Playwright |
| Linting | ESLint + `@vue/eslint-config-typescript` |
| CI/CD | GitHub Actions |
| Deploy | GitHub Pages |
