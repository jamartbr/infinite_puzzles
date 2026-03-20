/// <reference types="vite/client" />s
import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  // Hash history para compatibilidad con GitHub Pages (sin config de servidor)
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/components/HomeScreen.vue'),
    },
    {
      path: '/queens',
      name: 'queens',
      component: () => import('@/games/Queens/QueensGame.vue'),
      meta: { title: 'Queens' },
    },
    {
      path: '/loopy',
      name: 'loopy',
      component: () => import('@/games/Loopy/LoopyGame.vue'),
      meta: { title: 'Loopy' },
    },
    {
      path: '/slant',
      name: 'slant',
      component: () => import('@/games/Slant/SlantGame.vue'),
      meta: { title: 'Slant' },
    },
    {
      path: '/tetonor',
      name: 'tetonor',
      component: () => import('@/games/Tetonor/TetonorGame.vue'),
      meta: { title: 'Tetonor' },
    },
    {
      path: '/daily',
      name: 'daily',
      component: () => import('@/daily/DailyGame.vue'),
      meta: { title: 'Puzzle del día' },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

// Actualizar el título de la pestaña
router.afterEach((to) => {
  const title = to.meta?.title as string | undefined
  document.title = title ? `${title} — Infinite Puzzles` : 'Infinite Puzzles'
})

export default router
