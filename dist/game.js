"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Game {
    constructor() {
        this._currentGen = [];
        this._nextGen = [];
        this._interactions = [];
        // private _heatMap: number[][] = [];
        this._updates = [];
        this._dimensions = { cols: 80, rows: 80, gameWidth: 0, gameHeight: 0 };
        this._cellSize = 20;
        this._currentIteration = 0;
        this._tickSpeedMultiplier = 2;
        this._currentGen = new Array(this._dimensions.rows) // New array with rows
            .fill(0).map(row => new Array(this._dimensions.cols) // Fill array and map its contents
            .fill(0)
            .map(col => ({
            state: Math.floor(Math.random() * 2),
            heatCount: 0
        }))); // Map contents to column
        // console.log(this._currentGen);
        // for (let i = 0; i < this._dimensions.rows; i++) {
        //     for (let j = 0; j < this._dimensions.cols; j++) {
        //         this._heatMap[i][j] = 0;
        //     }
        // }
        this._dimensions.gameWidth = this._dimensions.cols * this._cellSize;
        this._dimensions.gameHeight = this._dimensions.rows * this._cellSize;
    }
    /* Getters */
    get nextGenPack() {
        return {
            currentIteration: this._currentIteration,
            nextGen: this._nextGen
        };
    }
    get initPack() {
        return {
            currentGen: this._currentGen,
            currentIteration: this._currentIteration,
            dimensions: this._dimensions,
            cellSize: this._cellSize,
            tickSpeedMultiplier: this._tickSpeedMultiplier
        };
    }
    get tickSpeed() {
        return this._tickSpeedMultiplier;
    }
    /* Functions */
    addPattern(pattern, offsetRow, offsetCol) {
        for (let i = 0; i < pattern.length; i++) {
            for (let j = 0; j < pattern.length; j++) {
                const row = i + offsetRow;
                const col = j + offsetCol;
                if (col < 0 || col >= this._dimensions.cols)
                    continue;
                if (row < 0 || row >= this._dimensions.rows)
                    continue;
                if (pattern[i][j] == 1) {
                    this._interactions.push([col, row, pattern[i][j]]);
                    // this._updates.push({ row, col, state: 1, heatCount: ++});
                }
            }
        }
    }
    upgradeGrid() {
        this._nextGen.length = 0;
        for (let row = 0; row < this._dimensions.rows; row++) {
            for (let col = 0; col < this._dimensions.cols; col++) {
                const cellState = this._currentGen[row][col].state;
                let liveNeighbors = 0;
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        const nRow = row + i;
                        const nCol = col + j;
                        if (i == 0 && j == 0)
                            continue;
                        if (nRow < 0 || nRow >= this._dimensions.rows)
                            continue;
                        if (nCol < 0 || nCol >= this._dimensions.cols)
                            continue;
                        const nCellState = this._currentGen[nRow][nCol].state;
                        if (nCellState)
                            liveNeighbors++;
                    }
                }
                if (cellState && (liveNeighbors < 2 || liveNeighbors > 3)) {
                    this._nextGen.push([row, col, 0]);
                    // this._updates.push({ row, col, state: 1, heatCount: ++this._heatMap[col + row * this._dimensions.cols], updated: true});
                }
                if (!cellState && liveNeighbors == 3) {
                    this._nextGen.push([row, col, 1]);
                }
            }
        }
        this._interactions.forEach(interaction => {
            // 0: row, 1: col, 2: state
            this._nextGen.push([interaction[0], interaction[1], interaction[2]]);
        });
        this._nextGen.forEach((next, i) => {
            this._currentGen[next[0]][next[1]].state = next[2];
            next.push(++this._currentGen[next[0]][next[1]].heatCount);
            // console.log(this._currentGen[next[0]][next[1]].heatCount);
            // console.log(next);
            // i % 1000 ? console.log(next) : null; 
        });
        this._interactions.length = 0;
        this._currentIteration++;
    }
}
exports.Game = Game;
