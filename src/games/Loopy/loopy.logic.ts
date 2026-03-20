import type { LoopyState, EdgeKey, EdgeState } from './loopy.types'

// ── Helpers ───────────────────────────────────────────────────────────────

export function edgeKey(r1: number, c1: number, r2: number, c2: number): EdgeKey {
  if (r1 > r2 || (r1 === r2 && c1 > c2)) return `${r2},${c2}-${r1},${c1}`
  return `${r1},${c1}-${r2},${c2}`
}

export function cellEdges(r: number, c: number): EdgeKey[] {
  return [
    edgeKey(r,   c,   r,   c+1),
    edgeKey(r+1, c,   r+1, c+1),
    edgeKey(r,   c,   r+1, c),
    edgeKey(r,   c+1, r+1, c+1),
  ]
}

export function allEdges(n: number): EdgeKey[] {
  const edges: EdgeKey[] = []
  for (let r = 0; r <= n; r++)
    for (let c = 0; c <= n; c++) {
      if (c < n) edges.push(edgeKey(r, c, r, c+1))
      if (r < n) edges.push(edgeKey(r, c, r+1, c))
    }
  return edges
}

function vertexEdges(r: number, c: number, n: number): EdgeKey[] {
  const es: EdgeKey[] = []
  if (c > 0) es.push(edgeKey(r, c-1, r, c))
  if (c < n) es.push(edgeKey(r, c,   r, c+1))
  if (r > 0) es.push(edgeKey(r-1, c, r, c))
  if (r < n) es.push(edgeKey(r,   c, r+1, c))
  return es
}

// ── Solver con constraint propagation ────────────────────────────────────
// Valores internos: 0=unknown, 1=on, -1=off

type Assignment = Map<EdgeKey, number>

function propagate(n: number, clues: (number|null)[][], assignment: Assignment): boolean {
  let changed = true
  while (changed) {
    changed = false

    // Regla de celdas: si on+unknown===clue → todos unknown=on
    //                  si on===clue         → todos unknown=off
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const clue = clues[r][c]
        if (clue === null) continue
        const es  = cellEdges(r, c)
        const on  = es.filter(e => assignment.get(e) ===  1).length
        const off = es.filter(e => assignment.get(e) === -1).length
        const unk = es.filter(e => assignment.get(e) ===  0)
        if (on > clue || on + unk.length < clue) return false
        if (unk.length === 0) continue
        if (on + unk.length === clue) {
          for (const e of unk) { assignment.set(e, 1);  changed = true }
        } else if (on === clue) {
          for (const e of unk) { assignment.set(e, -1); changed = true }
        }
      }
    }

    // Regla de vértices: grado máximo 2
    for (let r = 0; r <= n; r++) {
      for (let c = 0; c <= n; c++) {
        const es  = vertexEdges(r, c, n)
        const on  = es.filter(e => assignment.get(e) ===  1).length
        const unk = es.filter(e => assignment.get(e) ===  0)
        if (on > 2) return false
        if (on === 2 && unk.length > 0) {
          for (const e of unk) { assignment.set(e, -1); changed = true }
        }
        // Si grado on=1 y no hay unknowns → bucle abierto, inválido
        if (on === 1 && unk.length === 0) return false
      }
    }
  }
  return true
}

function checkComplete(n: number, clues: (number|null)[][], assignment: Assignment): boolean {
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const clue = clues[r][c]
      if (clue === null) continue
      if (cellEdges(r, c).filter(e => assignment.get(e) === 1).length !== clue) return false
    }
  const onEdges = [...assignment.entries()].filter(([,v]) => v === 1).map(([k]) => k)
  if (onEdges.length === 0) return false
  const deg = new Map<string, number>()
  for (const e of onEdges) {
    const [a, b] = e.split('-')
    deg.set(a, (deg.get(a) ?? 0) + 1)
    deg.set(b, (deg.get(b) ?? 0) + 1)
  }
  for (const d of deg.values()) if (d !== 2) return false
  const start = onEdges[0].split('-')[0]
  const vis = new Set([start])
  const q = [start]
  while (q.length) {
    const v = q.pop()!
    for (const e of onEdges) {
      const [a, b] = e.split('-')
      if (a === v && !vis.has(b)) { vis.add(b); q.push(b) }
      if (b === v && !vis.has(a)) { vis.add(a); q.push(a) }
    }
  }
  const active = new Set(onEdges.flatMap(e => e.split('-')))
  return vis.size === active.size
}

function countSolutions(
  n: number,
  clues: (number|null)[][],
  edges: EdgeKey[],
  assignment: Assignment,
  idx: number,
  max: number,
): number {
  const copy: Assignment = new Map(assignment)
  if (!propagate(n, clues, copy)) return 0

  // Avanzar al siguiente unknown después de propagación
  let nextIdx = idx
  while (nextIdx < edges.length && copy.get(edges[nextIdx]) !== 0) nextIdx++
  if (nextIdx === edges.length) return checkComplete(n, clues, copy) ? 1 : 0

  const key = edges[nextIdx]
  let total = 0

  const a1: Assignment = new Map(copy); a1.set(key, 1)
  total += countSolutions(n, clues, edges, a1, nextIdx + 1, max)
  if (total >= max) return total

  const a2: Assignment = new Map(copy); a2.set(key, -1)
  total += countSolutions(n, clues, edges, a2, nextIdx + 1, max)
  return total
}

function hasUniqueSolution(n: number, clues: (number|null)[][]): boolean {
  const edges = allEdges(n)
  const init: Assignment = new Map(edges.map(e => [e, 0]))
  return countSolutions(n, clues, edges, init, 0, 2) === 1
}

// ── Generación del bucle ──────────────────────────────────────────────────

function loopCellCoverage(n: number, loop: Set<EdgeKey>): number {
  let touched = 0
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (cellEdges(r, c).some(e => loop.has(e))) touched++
  return touched / (n * n)
}

function generateLoop(n: number): Set<EdgeKey> {
  // Random target between 75% and 100% coverage
  const targetCoverage = 0.75 + Math.random() * 0.25;

  for (let attempt = 0; attempt < 300; attempt++) {
    const vkey = (r: number, c: number) => `${r},${c}`
    const startR = Math.floor(Math.random() * (n + 1))
    const startC = Math.floor(Math.random() * (n + 1))
    const visited = new Set([vkey(startR, startC)])
    const pathV: [number, number][] = [[startR, startC]]
    const pathE: EdgeKey[] = []

    for (let steps = 0; steps < 300; steps++) {
      const [cr, cc] = pathV[pathV.length - 1]
      const nb = ([-1,0,1,0].map((dr,i) => [cr+dr, cc+([0,-1,0,1][i])] as [number,number]))
        .filter(([nr,nc]) => nr >= 0 && nr <= n && nc >= 0 && nc <= n)
        .sort(() => Math.random() - 0.5)

      if (pathV.length >= 4) {
        const close = nb.find(([nr,nc]) => nr === startR && nc === startC)        
        if (close) {
          const candidate = new Set([...pathE, edgeKey(cr, cc, startR, startC)])
          if (loopCellCoverage(n, candidate) >= targetCoverage && Math.random() < 0.15) {
            return candidate
          }
        }
      }
      const next = nb.find(([nr,nc]) => !visited.has(vkey(nr,nc)))
      if (!next) break
      visited.add(vkey(next[0], next[1]))
      pathE.push(edgeKey(cr, cc, next[0], next[1]))
      pathV.push(next)
    }
  }
  // Fallback rectangular
  const loop = new Set<EdgeKey>()
  const r1=1, c1=1, r2=n-1, c2=n-1
  for (let c=c1; c<c2; c++) loop.add(edgeKey(r1,c,r1,c+1))
  for (let c=c1; c<c2; c++) loop.add(edgeKey(r2,c,r2,c+1))
  for (let r=r1; r<r2; r++) loop.add(edgeKey(r,c1,r+1,c1))
  for (let r=r1; r<r2; r++) loop.add(edgeKey(r,c2,r+1,c2))
  loop.add(edgeKey(r1,c1,r1+1,c1))
  loop.add(edgeKey(r1,c2,r1+1,c2))
  return loop
}

function computeFullClues(n: number, solution: Set<EdgeKey>): number[][] {
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) =>
      cellEdges(r, c).filter(e => solution.has(e)).length
    )
  )
}

const CLUE_FRACTION = [0.80, 0.55, 0.35]

function generateClues(n: number, solution: Set<EdgeKey>, level: number): (number|null)[][] {
  const full = computeFullClues(n, solution)
  const clues: (number|null)[][] = full.map(row => [...row])
  const target  = Math.floor(n * n * CLUE_FRACTION[level])
  const positions = Array.from({ length: n*n }, (_, i) => [Math.floor(i/n), i%n] as [number,number])
    .sort(() => Math.random() - 0.5)
  let remaining = n * n
  for (const [r, c] of positions) {
    if (remaining <= target) break
    const saved = clues[r][c]
    clues[r][c] = null
    if (hasUniqueSolution(n, clues)) {
      remaining--
    } else {
      clues[r][c] = saved
    }
  }
  return clues
}

// ── API pública ───────────────────────────────────────────────────────────

export function createLoopyState(size = 5, level = 0): LoopyState {
  const solution = generateLoop(size)
  const clues    = generateClues(size, solution, level)
  const edgeMap  = new Map<EdgeKey, EdgeState>()
  for (const e of allEdges(size)) edgeMap.set(e, 'unknown')
  return { size, clues, solution, edges: edgeMap, status: 'idle', level }
}

export function toggleEdge(state: LoopyState, key: EdgeKey): void {
  const cur = state.edges.get(key) ?? 'unknown'
  state.edges.set(key, cur === 'unknown' ? 'on' : cur === 'on' ? 'off' : 'unknown')
}

export function cellInfo(state: LoopyState, r: number, c: number) {
  const es = cellEdges(r, c)
  return {
    on:      es.filter(e => state.edges.get(e) === 'on').length,
    off:     es.filter(e => state.edges.get(e) === 'off').length,
    unknown: es.filter(e => state.edges.get(e) === 'unknown').length,
    clue:    state.clues[r][c],
  }
}

export function checkWin(state: LoopyState): boolean {
  for (const [key, edgeState] of state.edges) {
    const inSol = state.solution.has(key)
    if (inSol  && edgeState !== 'on')  return false
    if (!inSol && edgeState === 'on')  return false
  }
  return true
}

export function progressCount(state: LoopyState) {
  let correct = 0
  for (const key of state.solution)
    if (state.edges.get(key) === 'on') correct++
  return { correct, total: state.solution.size }
}