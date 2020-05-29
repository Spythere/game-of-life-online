import { Vue, Component, Watch } from "vue-property-decorator";
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
        viewBox: {
            fromCellX: 0,
            fromCellY: 0,
            toCellX: 0,
            toCellY: 0
        },
        zoomFactor: 1,
    };

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

    toGameX(screenX: number) :number {
        return screenX / this.camera.zoomFactor - this.camera.offsetX;
    }

    toGameY(screenY: number) :number {
        return screenY / this.camera.zoomFactor - this.camera.offsetY;
    }

    toScreenX(gameX: number) :number {
        return (gameX + this.camera.offsetX) * this.camera.zoomFactor;
    }

    toScreenY(gameY: number) :number {
        return (gameY + this.camera.offsetY) * this.camera.zoomFactor;
    }

    calculateViewBox(){
        const boundary = this.context.canvas.getBoundingClientRect();

        this.camera.viewBox.fromCellX = Math.floor(-this.camera.offsetX / this.gameGrid.cellSize);
        this.camera.viewBox.toCellX = this.camera.viewBox.fromCellX +
            Math.floor(boundary.width / this.gameGrid.cellSize / this.camera.zoomFactor);

        this.camera.viewBox.fromCellY = Math.floor(-this.camera.offsetY / this.gameGrid.cellSize);
        this.camera.viewBox.toCellY = this.camera.viewBox.fromCellY +
            Math.floor(boundary.height / this.gameGrid.cellSize / this.camera.zoomFactor);

            console.log(this.camera.viewBox.fromCellX, this.camera.viewBox.toCellX);
    }


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
            const mouseZoomStartX = this.toGameX(e.pageX);
            const mouseZoomStartY = this.toGameY(e.pageY);

            if (e.deltaY < 0) this.camera.zoomFactor *= 1.05
            else this.camera.zoomFactor *= 0.95

            console.log(this.camera.zoomFactor);
            

            const mouseZoomEndX = this.toGameX(e.pageX);
            const mouseZoomEndY = this.toGameY(e.pageY);

            this.camera.offsetX -= mouseZoomStartX - mouseZoomEndX;
            this.camera.offsetY -= mouseZoomStartY - mouseZoomEndY;

            this.calculateViewBox();
            
        });
    }

    handleSocketConnection(): void {
        this.socket.on("init_pack", (initPack: any) => {
            this.gameGrid = { ...initPack };

            this.resizeCanvas();
            this.camera.offsetX = (this.context.canvas.width - this.gameGrid.dimensions.cols * this.gameGrid.cellSize) / 2;
            this.camera.offsetY = (this.context.canvas.height - this.gameGrid.dimensions.rows * this.gameGrid.cellSize) / 2;

            this.calculateViewBox();

            this.gameState = GameState.RUNNING;
            this.renderGame();
        });

        this.socket.on("update_pack", (updatePack: any) => {
            updatePack.nextGen.forEach((next: any) => {
                this.$set(this.gameGrid.currentGen[next[0]][next[1]], 'state', next[2]);
                this.$set(this.gameGrid.currentGen[next[0]][next[1]], 'heatCount', next[3]);

            });

            this.gameGrid.currentIteration = updatePack.currentIteration;
        });
    }

    toggleHeatmapView() {
        this.heatmapOn = !this.heatmapOn;
        console.log(`Heatmap view ${this.heatmapOn ? 'on' : 'off'}`);
    }

    resizeCanvas() {
        let width = (window.innerWidth < this.responsiveSm ? 1 : 0.9) * window.innerWidth;
        let height = window.innerHeight < width / this.canvasRatio || window.innerWidth < this.responsiveSm ? window.innerHeight : width / this.canvasRatio;

        this.context.canvas.width = width;
        this.context.canvas.height = height;

        this.canvasWidth = width;
        this.canvasHeight = height;
    }

    mouseOut(e: MouseEvent){
        // this.mouseDragging = false;
    }

    mouseMove(e: MouseEvent) {
        if (this.gameState != GameState.RUNNING) return;

        const boundaries = this.context.canvas.getBoundingClientRect();
        this.mouseCellCol = this.toScreenX(
            (e.pageX - this.camera.offsetX - boundaries.left) / this.gameGrid.cellSize 
        );

        this.mouseCellRow = this.toScreenY(
            (e.pageY - this.camera.offsetY - boundaries.top) / this.gameGrid.cellSize 
        );

        if (this.mouseDragging) {
            this.camera.offsetX = (e.pageX - this.mousePanStartX);
            this.camera.offsetY = (e.pageY - this.mousePanStartY);
        }

        this.calculateViewBox();
    }

    mouseDown(e: MouseEvent) {
        if (this.gameState != GameState.RUNNING) return;
        if (this.patternCreator.isPlacing) return;

        this.mousePanStartX = (e.pageX - this.camera.offsetX);
        this.mousePanStartY = (e.pageY - this.camera.offsetY);
        this.mouseDragging = true;
    }

    mouseUp(e: MouseEvent) {
        if (this.gameState != GameState.RUNNING) return;


        this.mouseDragging = false;
    }

    canvasClick(e: MouseEvent) {
        if (this.gameState != GameState.RUNNING) return;

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
        // this.context.translate(this.camera.offsetX, this.camera.offsetY);



        // Rendering grid
        this.context.lineWidth = 1;
        this.context.strokeStyle = "gray";
        for (let row = this.camera.viewBox.fromCellX; row <= this.camera.viewBox.toCellX + 1; row++) {
            for (let col = this.camera.viewBox.fromCellY; col <= this.camera.viewBox.toCellY + 1; col++) {
                if (row > this.gameGrid.dimensions.rows - 1 || row < 0) continue;
                if (col > this.gameGrid.dimensions.cols - 1 || col < 0) continue;

                const cell = this.gameGrid.currentGen[row][col];

                if (!this.heatmapOn) {
                    this.context.fillStyle = cell.state ? "black" : "white";
                } else {
                    this.context.fillStyle = `hsl(${cell.heatCount}, 100%, 50%)`;
                }


                this.context.fillRect(
                    this.toScreenX(row * this.gameGrid.cellSize),
                    this.toScreenY(col * this.gameGrid.cellSize),
                    this.gameGrid.cellSize * this.camera.zoomFactor,
                    this.gameGrid.cellSize * this.camera.zoomFactor
                );

                this.context.strokeRect(
                    this.toScreenX(row * this.gameGrid.cellSize),
                    this.toScreenY(col * this.gameGrid.cellSize),
                    this.gameGrid.cellSize * this.camera.zoomFactor,
                    this.gameGrid.cellSize * this.camera.zoomFactor
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
                            this.toScreenX(offsetCol),
                            this.toScreenY(offsetRow),
                            this.gameGrid.cellSize * this.camera.zoomFactor,
                            this.gameGrid.cellSize * this.camera.zoomFactor
                        );
                    }
                }
            }

            this.context.strokeStyle = outOfBounds ? "red" : "black";
            this.context.lineWidth = 2;
            this.context.strokeRect(
                this.toScreenX((this.mouseCellCol - 2) * this.gameGrid.cellSize),
                this.toScreenY((this.mouseCellRow - 2) * this.gameGrid.cellSize),
                this.gameGrid.cellSize * 5 * this.camera.zoomFactor,
                this.gameGrid.cellSize * 5 * this.camera.zoomFactor
            );
        }

        this.context.restore();
        requestAnimationFrame(this.renderGame);
    }
}