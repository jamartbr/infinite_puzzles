import type { ToggleCell, ToggleState, LineStatus } from "./toggle.types";
import { seededRng, seededShuffle } from "@/composables/useSeededRNG";

// ── Helpers ───────────────────────────────────────────────────────────────

export function countChanges(line: number[]): number {
    let c = 0;
    for (let i = 0; i < line.length-1; i++) {
        if (line[i] !== line[i+1]) c++;
    }
    return c;
}

function rowChanges(sol: number[][]): number[] {
    return sol.map(row => countChanges(row));
}

function colChanges(sol: number[][], n: number): number[] {
    return Array.from({ length: n }, (_, c) => countChanges(sol.map(r => r[c])));
}

// ── Solver ────────────────────────────────────────────────────────────────

type Board = ToggleCell[][];

function rowViable(board: Board, r: number, clue: number, n: number): boolean {
    const row = board[r];
    let ch = 0, unk = 0;
    for (let c = 0; c < n-1; c++) {
        if (row[c] === null || row[c+1] === null) {
            unk++;
            continue;
        }
        if (row[c] !== row[c+1]) ch++;
    }
    return ch <= clue && ch + unk >= clue;
}

function colViable(board: Board, c: number, clue: number, n: number): boolean {
    let ch = 0, unk = 0;
    for (let r = 0; r < n-1; r++) {
        if (board[r][c] === null || board[r+1][c] === null) {
            unk++;
            continue;
        }
        if (board[r][c] !== board[r+1][c]) ch++;
    }
    return ch <= clue && ch + unk >= clue;
}

function isComplete(board: Board, rowClues: number[], colClues: number[], n: number): boolean {
    for (let r = 0; r < n; r++) {
        if (board[r].includes(null)) return false;
        if (countChanges(board[r] as number[]) !== rowClues[r]) return false;
    }
    for (let c = 0; c < n; c++) {
        const col = board.map(row => row[c]) as number[];
        if (countChanges(col) !== colClues[c]) return false;
    }
    return true;
}

export function countSolutions(
    board: Board,
    rowClues: number[],
    colClues: number[],
    n: number,
    limit = 2,
): number {
    let nSol = 0;

    function bt(r: number, c: number) {
        if (nSol >= limit) return;
        if (r === n) {
            if (isComplete(board, rowClues, colClues, n)) nSol++;
            return;
        }

        const nr = c === n-1 ? r+1 : r;
        const nc = c === n-1 ? 0   : c+1;
        if (board[r][c] !== null) {
            bt(nr, nc);
            return;
        }

        for (const v of [0, 1] as (0 | 1)[]) {
            board[r][c] = v
            if (rowViable(board, r, rowClues[r], n) &&
                colViable(board, c, colClues[c], n)) {
                    bt(nr, nc);
                }
            if (nSol >= limit) return;
        }
        board[r][c] = null;
    }

    bt(0, 0);
    return nSol;
}

function hasUniqueSolution(
    sol: number[][],
    rowClues: number[],
    colClues: number[],
    fixed: [number, number][],
    n: number,
): boolean {
    const board: Board = Array.from({ length: n }, () => Array(n).fill(null));
    for (const [r,c] of fixed) board[r][c] = sol[r][c] as ToggleCell;
    return countSolutions(board, rowClues, colClues, n, 2) === 1;
}

// ── Generador de pistas ───────────────────────────────────────────────────

function generateGiven(
    sol: number[][],
    rowClues: number[],
    colClues: number[],
    n: number,
    level: number,
    rng: () => number,
): boolean[][] {
    // Shuffle positions
    const positions: [number, number][] = Array.from(
        {length: n*n }, (_,i) => [Math.floor(i/n), i%n]
    );
    seededShuffle(positions, rng);

    // Start with all fixed, remove iteratively. Restore if uniqueness lost
    const fixed = new Set(positions.map(([r,c]) => `${r},${c}`));
    for (const [r,c] of positions) {
        const key = `${r},${c}`;
        fixed.delete(key);
        const cells = [...fixed].map(k => k.split(',').map(Number) as [number, number]);
        if (!hasUniqueSolution(sol, rowClues, colClues, cells, n)) fixed.add(key);
    }

    // Minimum fixed set found -> Add extra cells depending on level
    const minFixed = new Set(fixed);
    const multiplier = level === 0 ? 2.0 : level === 1 ? 1.4 : 1.0;
    const targetCount = Math.min(
        Math.round(minFixed.size * multiplier),
        Math.floor(n * n * 0.5),    // never more than 50%
    )

    // Add extra cells from the non-fixed positions
    const extras = positions.filter(([r,c]) => !minFixed.has(`${r},${c}`));
    seededShuffle(extras, rng);
    for (const [r,c] of extras) {
        if (fixed.size >= targetCount) break;
        fixed.add(`${r},${c}`);
    }

    // Build given grid
    const given: boolean[][] = Array.from( {length: n}, () => Array(n).fill(false));
    for (const key of fixed) {
        const [r,c] = key.split(',').map(Number);
        given[r][c] = true;
    }
    return given;
}

// ── Validación ────────────────────────────────────────────────────────────

export function checkWin(state: ToggleState): boolean {
    const { board, rowClues, colClues, size } = state;
    for (let r = 0; r < size; r++) {
        if (board[r].includes(null)) return false;
        if (countChanges(board[r] as number[]) !== rowClues[r]) return false;
    }
    for (let c = 0; c < size; c++) {
        const col = board.map(row => row[c]) as number[];
        if (countChanges(col) !== colClues[c]) return false;
    }
    return true;
}

export function rowStatus(state: ToggleState, r: number): LineStatus {
    const row = state.board[r];
    const clue = state.rowClues[r];
    const n = state.size;
    let ch = 0, unk = 0;
    for (let c = 0; c < n-1; c++) {
        if (row[c] === null || row[c+1] === null) {
            unk++;
            continue;
        }
        if (row[c] !== row[c+1]) ch++;
    }
    if (unk === 0) return ch === clue ? 'done' : 'impossible';
    if (ch > clue || ch+unk < clue) return 'impossible';
    return 'partial';
}

export function colStatus(state: ToggleState, c: number): LineStatus {
    const clue = state.colClues[c];
    const n = state.size;
    let ch = 0, unk = 0;
    for (let r = 0; r < n-1; r++) {
        const a = state.board[r][c], b = state.board[r+1][c];
        if (a === null || b === null) {
            unk++;
            continue;
        }
        if (a !== b) ch++;
    }
    if (unk === 0) return ch === clue ? 'done' : 'impossible';
    if (ch > clue || ch+unk < clue) return 'impossible';
    return 'partial';
}

// ── API pública ───────────────────────────────────────────────────────────

export function createToggleState(
    size = 6,
    level = 0,
    rng: () => number = Math.random,
): ToggleState {
    // Generate random binary solution
    const solution: number[][] = Array.from({length: size}, () =>
        Array.from({length: size}, () => Math.floor(rng() * 2))    
    )

    const rowClues = rowChanges(solution);
    const colClues = colChanges(solution, size);
    const given = generateGiven(solution, rowClues, colClues, size, level, rng);

    // Initialize board with given cells
    const board: ToggleCell[][] = Array.from({length: size}, (_, r) =>
        Array.from({length: size}, (_, c) =>
            given[r][c] ? (solution[r][c] as ToggleCell) : null
        )
    )

    return { size, board, given, solution, rowClues, colClues, moves: 0, status: 'idle', level };
}

export function generateToggleState(size = 6, level = 0): ToggleState {
    return createToggleState(size, level);
}

export function generateDailyToggleState(seed: number, size: number, level: number): ToggleState {
    return createToggleState(size, level, seededRng(seed));
}