export const COLS = 7;
export const ROWS = 6;

export type Player = 1 | 2;
export type Cell = 0 | Player;
export type Status = 'playing' | 'win' | 'draw';

export interface Move {
  col: number;
  row: number;
  player: Player;
}

export interface State {
  board: Cell[][];
  current: Player;
  status: Status;
  winner: Player | null;
  winningCells: [number, number][] | null;
  lastMove: Move | null;
}

export function createState(): State {
  const board: Cell[][] = [];
  for (let c = 0; c < COLS; c++) {
    const col: Cell[] = [];
    for (let r = 0; r < ROWS; r++) col.push(0);
    board.push(col);
  }
  return {
    board,
    current: 1,
    status: 'playing',
    winner: null,
    winningCells: null,
    lastMove: null,
  };
}

export function drop(s: State, col: number): State {
  if (s.status !== 'playing') return s;
  if (col < 0 || col >= COLS) return s;

  let row = -1;
  for (let r = 0; r < ROWS; r++) {
    if (s.board[col][r] === 0) {
      row = r;
      break;
    }
  }
  if (row === -1) return s;

  const player = s.current;
  const newBoard = s.board.map((colArr, i) => (i === col ? [...colArr] : colArr));
  newBoard[col][row] = player;

  const winCells = checkWin(newBoard, col, row, player);
  const isDraw = !winCells && newBoard.every((c) => c[ROWS - 1] !== 0);

  return {
    board: newBoard,
    current: player === 1 ? 2 : 1,
    status: winCells ? 'win' : isDraw ? 'draw' : 'playing',
    winner: winCells ? player : null,
    winningCells: winCells,
    lastMove: { col, row, player },
  };
}

function checkWin(
  board: Cell[][],
  col: number,
  row: number,
  player: Player,
): [number, number][] | null {
  const dirs: [number, number][] = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (const [dx, dy] of dirs) {
    const line: [number, number][] = [[col, row]];
    for (let k = 1; k < 4; k++) {
      const c = col + dx * k;
      const r = row + dy * k;
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) break;
      if (board[c][r] !== player) break;
      line.push([c, r]);
    }
    for (let k = 1; k < 4; k++) {
      const c = col - dx * k;
      const r = row - dy * k;
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) break;
      if (board[c][r] !== player) break;
      line.unshift([c, r]);
    }
    if (line.length >= 4) {
      const placedIdx = line.findIndex(([c, r]) => c === col && r === row);
      let start = Math.max(0, placedIdx - 3);
      start = Math.min(start, line.length - 4);
      return line.slice(start, start + 4);
    }
  }
  return null;
}
