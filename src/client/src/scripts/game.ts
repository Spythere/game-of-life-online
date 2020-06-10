import { Vue, Component, Watch } from "vue-property-decorator";
import io from "socket.io-client";

import PatternCreator from "./pattern_creator";

enum GameState {
  LOADING = 0,
  PREPARED = 1,
  RUNNING = 2,
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
      toCellY: 0,
    },
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
  needRedraw: boolean = false;

  isDev: boolean = process.env.NODE_ENV === "development";
  devPort: number = 2000;

  gameGrid!: {
    currentGen: { state: number; heatCount: number }[][];
    updates: { row: number; col: number; state: number }[];
    currentIteration: number;
    dimensions: {
      cols: number;
      rows: number;
      gameWidth: number;
      gameHeight: number;
    };
    cellSize: number;
    tickSpeedMultiplier: number;
  };

  context!: CanvasRenderingContext2D;
  canvasWidth!: number;
  canvasHeight!: number;
  canvasRatio: number = 16 / 9;

  canvasBoundary!: ClientRect;

  responsiveSm: number = 900;

  socket!: any;

  calculateViewBox() {
    this.camera.viewBox.fromCellX = Math.floor(
      -this.camera.offsetX / this.gameGrid.cellSize
    );
    this.camera.viewBox.toCellX =
      this.camera.viewBox.fromCellX +
      Math.floor(this.canvasBoundary.width / this.gameGrid.cellSize);

    this.camera.viewBox.fromCellY = Math.floor(
      -this.camera.offsetY / this.gameGrid.cellSize
    );
    this.camera.viewBox.toCellY =
      this.camera.viewBox.fromCellY +
      Math.floor(this.canvasBoundary.height / this.gameGrid.cellSize);
  }

  created() {
    this.socket = io(this.isDev ? `http://localhost:${this.devPort}` : "");

    this.handleSocketConnection();
  }

  mounted() {
    this.context = (this.$refs.canvas as HTMLCanvasElement).getContext(
      "2d"
    ) as CanvasRenderingContext2D;

    window.addEventListener("resize", () => {
      this.resizeCanvas();
      this.drawCurrentScene();
    });
  }

  handleSocketConnection(): void {
    this.socket.on("init_pack", (initPack: any) => {
      this.gameGrid = { ...initPack };

      this.resizeCanvas();
      this.camera.offsetX =
        (this.context.canvas.width -
          this.gameGrid.dimensions.cols * this.gameGrid.cellSize) /
        2;
      this.camera.offsetY =
        (this.context.canvas.height -
          this.gameGrid.dimensions.rows * this.gameGrid.cellSize) /
        2;

      this.calculateViewBox();

      this.drawCurrentScene();
      this.gameState = GameState.RUNNING;

      this.gameLoop();
    });

    this.socket.on("update_pack", (updatePack: any) => {
      this.gameGrid.updates = updatePack.nextGen;

      this.gameGrid.updates.forEach((update) => {
        this.gameGrid.currentGen[update.row][update.col].state = update.state;

        if (
          update.row >= this.camera.viewBox.fromCellY &&
          update.row <= this.camera.viewBox.toCellY &&
          update.col >= this.camera.viewBox.fromCellX &&
          update.col <= this.camera.viewBox.toCellX
        ) {
          this.context.fillStyle = update.state ? "black" : "white";

          this.context.fillRect(
            update.col * this.gameGrid.cellSize + this.camera.offsetX,
            update.row * this.gameGrid.cellSize + this.camera.offsetY,
            this.gameGrid.cellSize,
            this.gameGrid.cellSize
          );

          this.context.strokeRect(
            update.col * this.gameGrid.cellSize + this.camera.offsetX,
            update.row * this.gameGrid.cellSize + this.camera.offsetY,
            this.gameGrid.cellSize,
            this.gameGrid.cellSize
          );
        }
      });

      this.gameGrid.currentIteration = updatePack.currentIteration;
    });
  }

  toggleHeatmapView() {
    this.heatmapOn = !this.heatmapOn;
  }

  resizeCanvas() {
    // let width = (window.innerWidth < this.responsiveSm ? 1 : 0.9) * window.innerWidth;
    // let height = window.innerHeight < width / this.canvasRatio || window.innerWidth < this.responsiveSm ? window.innerHeight : width / this.canvasRatio;

    let width = Math.min(window.innerWidth, 1400);
    let height = 800;

    this.context.canvas.width = width;
    this.context.canvas.height = height;

    this.canvasWidth = width;
    this.canvasHeight = height;

    this.canvasBoundary = this.context.canvas.getBoundingClientRect();
  }

  mouseOut(e: MouseEvent) {
    this.mouseDragging = false;
  }

  mouseMove(e: MouseEvent) {
    if (this.gameState != GameState.RUNNING) return;

    this.mouseCellCol = Math.floor(
      (e.pageX - this.camera.offsetX - this.canvasBoundary.left) /
        this.gameGrid.cellSize
    );

    this.mouseCellRow = Math.floor(
      (e.pageY - this.camera.offsetY - this.canvasBoundary.top) /
        this.gameGrid.cellSize
    );

    if (this.mouseDragging) {
      this.camera.offsetX = e.pageX - this.mousePanStartX;
      this.camera.offsetY = e.pageY - this.mousePanStartY;
      this.calculateViewBox();

      this.needRedraw = true;
      this.drawCurrentScene();
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

    if (this.mouseDragging) {
      this.camera.offsetX = e.pageX - this.mousePanStartX;
      this.camera.offsetY = e.pageY - this.mousePanStartY;

      // this.calculateViewBox();
      this.drawCurrentScene();

      this.mouseDragging = false;
      this.needRedraw = false;
    }
  }

  canvasClick(e: MouseEvent) {
    if (this.gameState != GameState.RUNNING) return;

    if (this.patternCreator.isOpen || !this.patternCreator.isPlacing) return;

    this.socket.emit("create_pattern", {
      pattern: this.patternCreator.grid,
      offsetRow: this.mouseCellRow - 2,
      offsetCol: this.mouseCellCol - 2,
    });

    this.patternCreator.resetGrid();
    this.patternCreator.closeCreator();
  }

  drawCurrentScene() {
    this.context.fillStyle = "white";
    this.context.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // All game states
    this.context.fillStyle = "black";
    for (let row = this.camera.viewBox.fromCellY; row < this.camera.viewBox.toCellY + 1; row++) {
      for (let col = this.camera.viewBox.fromCellX; col < this.camera.viewBox.toCellX + 1; col++) {
        if(row < 0 || row > this.gameGrid.dimensions.rows - 1) continue;
        if(col < 0 || col > this.gameGrid.dimensions.cols - 1) continue;

        if (this.gameGrid.currentGen[row][col].state == 1)
          this.context.fillRect(
            col * this.gameGrid.cellSize + this.camera.offsetX,
            row * this.gameGrid.cellSize + this.camera.offsetY,
            this.gameGrid.cellSize,
            this.gameGrid.cellSize
          );
      }
    }

    this.context.lineWidth = 1;
    this.context.strokeStyle = "gray";

    // Grid on top layer
    for (let row = this.camera.viewBox.fromCellY; row < this.camera.viewBox.toCellY + 1; row++) {
      for (let col = this.camera.viewBox.fromCellX; col < this.camera.viewBox.toCellX + 1; col++) {
        if(row < 0 || row > this.gameGrid.dimensions.rows - 1) continue;
        if(col < 0 || col > this.gameGrid.dimensions.cols - 1) continue;
        
        this.context.strokeRect(
          col * this.gameGrid.cellSize + this.camera.offsetX,
          row * this.gameGrid.cellSize + this.camera.offsetY,
          this.gameGrid.cellSize,
          this.gameGrid.cellSize
        );
      }
    }
  }

  gameLoop() {
    requestAnimationFrame(this.gameLoop);
  }

  renderGame() {
    if (this.gameState != GameState.RUNNING) {
      requestAnimationFrame(this.renderGame);
      return;
    }

    //If there's an update for a cell, redraw it in proper position

    let outOfBounds = false;
    if (this.patternCreator.isPlacing) {
      this.context.fillStyle = "green";

      for (let i = 0; i < this.patternCreator.grid.length; i++) {
        for (let j = 0; j < this.patternCreator.grid.length; j++) {
          const offsetCol = Math.floor(
            (this.mouseCellCol + j - 2) * this.gameGrid.cellSize
          );
          const offsetRow = Math.floor(
            (this.mouseCellRow + i - 2) * this.gameGrid.cellSize
          );

          if (
            offsetRow < 0 ||
            offsetRow >= this.gameGrid.dimensions.gameHeight
          ) {
            outOfBounds = true;
            continue;
          }

          if (
            offsetCol < 0 ||
            offsetCol >= this.gameGrid.dimensions.gameWidth
          ) {
            outOfBounds = true;
            continue;
          }

          if (this.patternCreator.grid[i][j] == 1) {
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

    // for (let row = 0; row < this.gameGrid.dimensions.rows; row++) {
    //     for (let col = 0; col < this.gameGrid.dimensions.cols; col++) {
    //         // for (let row = this.camera.viewBox.fromCellX - 1; row <= this.camera.viewBox.toCellX + 1; row++) {
    //         //     for (let col = this.camera.viewBox.fromCellY - 1; col <= this.camera.viewBox.toCellY + 1; col++) {
    //         if (row > this.gameGrid.dimensions.rows - 1 || row < 0) continue;
    //         if (col > this.gameGrid.dimensions.cols - 1 || col < 0) continue;

    //         const cell = this.gameGrid.currentGen[row][col];

    //         // if (!this.heatmapOn)
    //         //     this.context.fillStyle = cell.state ? "black" : "white";
    //         // else
    //         //     this.context.fillStyle = `hsl(${cell.heatCount}, 100%, 50%)`;

    //         this.context.fillStyle = cell.state ? "black" : "white";

    //         this.context.fillRect(
    //             row * this.gameGrid.cellSize + this.camera.offsetX,
    //             col * this.gameGrid.cellSize + this.camera.offsetY,
    //             this.gameGrid.cellSize,
    //             this.gameGrid.cellSize
    //         );

    //         // this.context.strokeRect(
    //         //     row * this.gameGrid.cellSize + this.camera.offsetX,
    //         //     col * this.gameGrid.cellSize + this.camera.offsetY,
    //         //     this.gameGrid.cellSize,
    //         //     this.gameGrid.cellSize
    //         // );
    //     }
    // }

    // //Render pattern preview if in placing pattern mode
    // let outOfBounds = false;
    // if (this.patternCreator.isPlacing) {
    //     this.context.fillStyle = "green";

    //     for (let i = 0; i < this.patternCreator.grid.length; i++) {
    //         for (let j = 0; j < this.patternCreator.grid.length; j++) {
    //             const offsetCol = Math.floor((this.mouseCellCol + j - 2) * this.gameGrid.cellSize);
    //             const offsetRow = Math.floor((this.mouseCellRow + i - 2) * this.gameGrid.cellSize);

    //             if (offsetRow < 0 || offsetRow >= this.gameGrid.dimensions.gameHeight) {
    //                 outOfBounds = true;
    //                 continue;
    //             }

    //             if (offsetCol < 0 || offsetCol >= this.gameGrid.dimensions.gameWidth) {
    //                 outOfBounds = true;
    //                 continue;
    //             }

    //             if (this.patternCreator.grid[i][j] == 1) {
    //                 this.context.fillRect(
    //                     (offsetCol),
    //                     (offsetRow),
    //                     this.gameGrid.cellSize,
    //                     this.gameGrid.cellSize
    //                 );
    //             }
    //         }
    //     }

    //     this.context.strokeStyle = outOfBounds ? "red" : "black";
    //     this.context.lineWidth = 2;
    //     this.context.strokeRect(
    //         (this.mouseCellCol - 2) * this.gameGrid.cellSize,
    //         (this.mouseCellRow - 2) * this.gameGrid.cellSize,
    //         this.gameGrid.cellSize * 5,
    //         this.gameGrid.cellSize * 5
    //     );
    // }

    // requestAnimationFrame(this.renderGame);
  }
}
