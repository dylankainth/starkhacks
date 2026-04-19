"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.drop = exports.createState = exports.ROWS = exports.COLS = void 0;
exports.COLS = 7;
exports.ROWS = 6;
function createState() {
    var board = [];
    for (var c = 0; c < exports.COLS; c++) {
        var col = [];
        for (var r = 0; r < exports.ROWS; r++)
            col.push(0);
        board.push(col);
    }
    return {
        board: board,
        current: 1,
        status: 'playing',
        winner: null,
        winningCells: null,
        lastMove: null
    };
}
exports.createState = createState;
function drop(s, col) {
    if (s.status !== 'playing')
        return s;
    if (col < 0 || col >= exports.COLS)
        return s;
    var row = -1;
    for (var r = 0; r < exports.ROWS; r++) {
        if (s.board[col][r] === 0) {
            row = r;
            break;
        }
    }
    if (row === -1)
        return s;
    var player = s.current;
    var newBoard = s.board.map(function (colArr, i) { return (i === col ? __spreadArray([], colArr, true) : colArr); });
    newBoard[col][row] = player;
    var winCells = checkWin(newBoard, col, row, player);
    var isDraw = !winCells && newBoard.every(function (c) { return c[exports.ROWS - 1] !== 0; });
    return {
        board: newBoard,
        current: player === 1 ? 2 : 1,
        status: winCells ? 'win' : isDraw ? 'draw' : 'playing',
        winner: winCells ? player : null,
        winningCells: winCells,
        lastMove: { col: col, row: row, player: player }
    };
}
exports.drop = drop;
function checkWin(board, col, row, player) {
    var dirs = [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, -1],
    ];
    for (var _i = 0, dirs_1 = dirs; _i < dirs_1.length; _i++) {
        var _a = dirs_1[_i], dx = _a[0], dy = _a[1];
        var line = [[col, row]];
        for (var k = 1; k < 4; k++) {
            var c = col + dx * k;
            var r = row + dy * k;
            if (c < 0 || c >= exports.COLS || r < 0 || r >= exports.ROWS)
                break;
            if (board[c][r] !== player)
                break;
            line.push([c, r]);
        }
        for (var k = 1; k < 4; k++) {
            var c = col - dx * k;
            var r = row - dy * k;
            if (c < 0 || c >= exports.COLS || r < 0 || r >= exports.ROWS)
                break;
            if (board[c][r] !== player)
                break;
            line.unshift([c, r]);
        }
        if (line.length >= 4) {
            var placedIdx = line.findIndex(function (_a) {
                var c = _a[0], r = _a[1];
                return c === col && r === row;
            });
            var start = Math.max(0, placedIdx - 3);
            start = Math.min(start, line.length - 4);
            return line.slice(start, start + 4);
        }
    }
    return null;
}
