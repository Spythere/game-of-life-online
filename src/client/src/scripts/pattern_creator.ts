export default class PatternCreator {
    private _grid: number[][];
    private _creatorOpen: boolean = false;
    private _placingPattern: boolean = false;
    private _instance: Vue;

    constructor(instance: Vue) {
        this._grid = [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0]
        ];

        this._instance = instance;
    }

    get grid(): number[][] {
        return this._grid;
    }

    get isOpen(): boolean {
        return this._creatorOpen;
    }

    get isPlacing(): boolean {
        return this._placingPattern;
    }

    resetGrid(): void {
        for (let r = 0; r < this._grid.length; r++) {
            for (let c = 0; c < this._grid[r].length; c++) {
                this._instance.$set(this._grid[r], c, 0);
            }
        }
    }

    openCreator(): void {
        this._creatorOpen = true;
        this._placingPattern = false;
    }

    closeCreator(): void {
        this._creatorOpen = false;
        this._placingPattern = false;
    }

    choosePattern(): void {
        this._creatorOpen = false;
        this._placingPattern = true;
    }

    toggleCell(r: number, c: number): void {
        this._instance.$set(this._grid[r], c, this._grid[r][c] ? 0 : 1);
    }
}