/**
 * maze.js — Maze generation using Recursive Backtracking (DFS)
 *
 * Each cell has 4 walls: N(orth), S(outh), E(ast), W(est).
 * A wall between two cells is removed when the algorithm visits.
 * Returns a 2D grid of Cell objects.
 */

// Bit flags for walls
export const WALL = { N: 1, S: 2, E: 4, W: 8 };
// Opposite of each direction
const OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E' };
// Direction vectors
const DIR = {
  N: { dc: 0, dr: -1 },
  S: { dc: 0, dr:  1 },
  E: { dc: 1, dr:  0 },
  W: { dc: -1, dr: 0 },
};

/**
 * Generate a maze grid using Recursive Backtracking.
 * @param {number} cols - number of columns
 * @param {number} rows - number of rows
 * @returns {Uint8Array[]} grid where each cell is a bitmask of open walls
 */
export function generateMaze(cols, rows) {
  // Each cell: bitmask of walls that are OPEN (passage exists)
  // Start: all walls CLOSED (0x00)
  const grid = Array.from({ length: rows }, () => new Uint8Array(cols));

  const visited = Array.from({ length: rows }, () => new Uint8Array(cols));
  const stack = [];

  function carve(col, row) {
    visited[row][col] = 1;
    const dirs = shuffle(['N', 'S', 'E', 'W']);
    for (const d of dirs) {
      const nc = col + DIR[d].dc;
      const nr = row + DIR[d].dr;
      if (nc >= 0 && nc < cols && nr >= 0 && nr < rows && !visited[nr][nc]) {
        // Remove wall between current cell and neighbour
        grid[row][col] |= WALL[d];
        grid[nr][nc]   |= WALL[OPPOSITE[d]];
        carve(nc, nr);
      }
    }
  }

  // Use iterative approach to avoid call-stack overflow on large grids
  iterativeCarve(grid, visited, cols, rows);

  return grid;
}

function iterativeCarve(grid, visited, cols, rows) {
  const stack = [{ col: 0, row: 0 }];
  visited[0][0] = 1;

  while (stack.length > 0) {
    const { col, row } = stack[stack.length - 1];
    const dirs = shuffle(['N', 'S', 'E', 'W']);
    let moved = false;

    for (const d of dirs) {
      const nc = col + DIR[d].dc;
      const nr = row + DIR[d].dr;
      if (nc >= 0 && nc < cols && nr >= 0 && nr < rows && !visited[nr][nc]) {
        grid[row][col] |= WALL[d];
        grid[nr][nc]   |= WALL[OPPOSITE[d]];
        visited[nr][nc] = 1;
        stack.push({ col: nc, row: nr });
        moved = true;
        break;
      }
    }

    if (!moved) stack.pop();
  }
}

/** Fisher-Yates shuffle, returns a new array */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Level configurations
 */
export const LEVELS = {
  easy:   { cols: 6,  rows: 6,  name: 'Easy',   icon: '🐢', color: '#3ecf6e' },
  medium: { cols: 8,  rows: 8,  name: 'Medium',  icon: '🐇', color: '#f5a623' },
  hard:   { cols: 10, rows: 10, name: 'Hard',    icon: '🦁', color: '#e85454' },
};
