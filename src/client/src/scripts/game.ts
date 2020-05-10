import { Vue, Component } from "vue-property-decorator";
import io from "socket.io-client";

import PatternCreator from './pattern_creator'

enum GameState {
    LOADING = 0,
    PREPARED = 1,
    RUNNING = 2
}

@Component
export default class Home extends Vue {
    patternCreator: PatternCreator = new PatternCreator(this);
    gameState: number = GameState.LOADING;

    camera = {
        offsetX: 0,
        offsetY: 0,
        zoomFactor: 1
    }

    // Mouse variables
    mouseX: number = 0;
    mouseY: number = 0;

    mousePanStartX: number = 0;
    mousePanStartY: number = 0;

    mouseZoomStartX: number = 0;
    mouseZoomStartY: number = 0;

    mouseCellRow: number = 0;
    mouseCellCol: number = 0;

    mouseDragging: boolean = false;
    heatmapOn: boolean = false;

    isDev: boolean = process.env.NODE_ENV === "development";
    devPort: number = 2000;

    gameGrid!: {
        currentGen: { state: number; heatCount: number; }[][];
        currentIteration: number;
        dimensions: { cols: number; rows: number, gameWidth: number; gameHeight: number; };
        cellSize: number;
        tickSpeedMultiplier: number;
    };

    context!: CanvasRenderingContext2D;
    canvasWidth!: number;
    canvasHeight!: number;
    canvasRatio: number = 16 / 9;

    responsiveSm: number = 900;

    socket!: any;

    created() {
        this.socket = io(this.isDev ? `http://localhost:${this.devPort}` : "");

        this.handleSocketConnection();
    }

    mounted() {
        this.context = (this.$refs.canvas as HTMLCanvasElement).getContext(
            "2d"
        ) as CanvasRenderingContext2D;

        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });

        window.addEventListener('wheel', (e: WheelEvent) => {
            // if (e.deltaY < 0) this.camera.zoomFactor *= 1.05
            // else this.camera.zoomFactor *= 0.95
        })
    }

    handleSocketConnection(): void {
        this.socket.on("init_pack", (initPack: any) => {
            this.gameGrid = { ...initPack };

            // console.log(initPack.heatMap);


            this.resizeCanvas();
            this.camera.offsetX = (this.context.canvas.width - this.gameGrid.dimensions.cols * this.gameGrid.cellSize) / 2;
            this.camera.offsetY = (this.context.canvas.height - this.gameGrid.dimensions.rows * this.gameGrid.cellSize) / 2;

            this.gameState = GameState.RUNNING;
            this.renderGame();
        });

        this.socket.on("update_pack", (updatePack: any) => {
            // this.gameGrid.currentGen = updatePack.currentGen
            updatePack.nextGen.forEach((next: any) => {
                // this.gameGrid.currentGen[next[0]][next[1]].state = next[2];
                // this.gameGrid.currentGen[next[0]][next[1]].heatCount = next[3];

                this.$set(this.gameGrid.currentGen[next[0]][next[1]], 'state', next[2]);
                this.$set(this.gameGrid.currentGen[next[0]][next[1]], 'heatCount', next[3]);

            });

            // console.log(this.gameGrid.currentGen[0][1].heatCount);


            this.gameGrid.currentIteration = updatePack.currentIteration;
        });
    }

    toggleHeatmapView() {
        this.heatmapOn = !this.heatmapOn;
        console.log(`Heatmap view ${this.heatmapOn ? 'on' : 'off'}`);
    }

    resizeCanvas() {
        let width = (window.innerWidth < this.responsiveSm ? 1 : 0.8) * window.innerWidth;
        let height = window.innerHeight < width / this.canvasRatio || window.innerWidth < this.responsiveSm ? window.innerHeight : width / this.canvasRatio;

        this.context.canvas.width = width;
        this.context.canvas.height = height;

        this.canvasWidth = width;
        this.canvasHeight = height;
    }

    mouseMove(e: MouseEvent) {
        if (this.gameState != GameState.RUNNING) return;

        const boundaries = this.context.canvas.getBoundingClientRect();
        this.mouseCellCol = Math.floor(
            (e.pageX - this.camera.offsetX - boundaries.left) / this.gameGrid.cellSize
        );

        this.mouseCellRow = Math.floor(
            (e.pageY - this.camera.offsetY - boundaries.top) / this.gameGrid.cellSize
        );

        if (this.mouseDragging) {
            this.camera.offsetX = (e.pageX - this.mousePanStartX) / this.camera.zoomFactor;
            this.camera.offsetY = (e.pageY - this.mousePanStartY) / this.camera.zoomFactor;
        }
    }

    mouseDown(e: MouseEvent) {
        if (this.gameState != GameState.RUNNING) return;
        if (this.patternCreator.isPlacing) return;


        this.mousePanStartX = e.pageX - this.camera.offsetX;
        this.mousePanStartY = e.pageY - this.camera.offsetY;
        this.mouseDragging = true;
    }

    mouseUp(e: MouseEvent) {
        if (this.gameState != GameState.RUNNING) return;

        this.mouseDragging = false;
    }

    canvasClick(e: MouseEvent) {
        if (this.gameState != GameState.RUNNING) return;

        // console.log(this.gameGrid.currentGen[this.mouseCellRow][this.mouseCellCol].heatCount);
        // console.log(this.mouseCellRow, this.mouseCellCol);



        if (this.patternCreator.isOpen || !this.patternCreator.isPlacing) return;

        this.socket.emit("create_pattern", {
            pattern: this.patternCreator.grid,
            offsetRow: this.mouseCellRow - 2,
            offsetCol: this.mouseCellCol - 2
        });

        this.patternCreator.resetGrid();
        this.patternCreator.closeCreator();
    }

    renderGame() {
        if (this.gameState != GameState.RUNNING) {
            requestAnimationFrame(this.renderGame);
            return;
        }

        this.context.fillStyle = "#333";
        this.context.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        this.context.save();
        // this.context.transform(this.camera.zoomFactor, 0, 0, this.camera.zoomFactor, this.camera.offsetX, this.camera.offsetY);
        this.context.translate(this.camera.offsetX, this.camera.offsetY);

        // Rendering grid
        this.context.lineWidth = 1;
        this.context.strokeStyle = "gray";
        for (let row = 0; row < this.gameGrid.dimensions.rows; row++) {
            for (let col = 0; col < this.gameGrid.dimensions.cols; col++) {
                const cell = this.gameGrid.currentGen[row][col];

                if (!this.heatmapOn) {
                    this.context.fillStyle = cell.state ? "black" : "white";
                } else {
                    this.context.fillStyle = `hsl(${cell.heatCount}, 100%, 50%)`;
                }


                this.context.fillRect(
                    row * this.gameGrid.cellSize,
                    col * this.gameGrid.cellSize,
                    this.gameGrid.cellSize,
                    this.gameGrid.cellSize
                );

                this.context.strokeRect(
                    row * this.gameGrid.cellSize,
                    col * this.gameGrid.cellSize,
                    this.gameGrid.cellSize,
                    this.gameGrid.cellSize
                );
            }
        }

        //Render pattern preview if in placing pattern mode
        let outOfBounds = false;
        if (this.patternCreator.isPlacing) {
            this.context.fillStyle = "green";

            for (let i = 0; i < this.patternCreator.grid.length; i++) {
                for (let j = 0; j < this.patternCreator.grid.length; j++) {
                    const offsetCol = Math.floor((this.mouseCellCol + j - 2) * this.gameGrid.cellSize);
                    const offsetRow = Math.floor((this.mouseCellRow + i - 2) * this.gameGrid.cellSize);

                    if (this.patternCreator.grid[i][j] == 1) {
                        if (offsetRow < 0 || offsetRow >= this.gameGrid.dimensions.gameHeight) {
                            outOfBounds = true;
                            continue;
                        }

                        if (offsetCol < 0 || offsetCol >= this.gameGrid.dimensions.gameWidth) {
                            outOfBounds = true;
                            continue;
                        }


                        this.context.fillRect(
                            offsetCol,
                            offsetRow,
                            this.gameGrid.cellSize,
                            this.gameGrid.cellSize
                        );
                    }
                }
            }

            this.context.strokeStyle = outOfBounds ? "red" : "black";
            this.context.lineWidth = 2;
            this.context.strokeRect(
                (this.mouseCellCol - 2) * this.gameGrid.cellSize,
                (this.mouseCellRow - 2) * this.gameGrid.cellSize,
                this.gameGrid.cellSize * 5,
                this.gameGrid.cellSize * 5
            );
        }

        this.context.restore();
        requestAnimationFrame(this.renderGame);
    }
}