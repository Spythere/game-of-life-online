"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = __importDefault(require("socket.io"));
const http_1 = __importDefault(require("http"));
const game_1 = require("./game");
class User {
    constructor(id) {
        this.id = id;
    }
}
class App {
    constructor() {
        this.PORT = process.env.PORT || 2000;
        this.app = express_1.default();
        this.server = http_1.default.createServer(this.app);
        this.io = socket_io_1.default(this.server);
        this.game = new game_1.Game();
        this.app.use(express_1.default.static(path_1.default.resolve(__dirname, './public')));
        this.server.listen(this.PORT, () => {
            console.log(`Server is running on port ${this.PORT}`);
        });
        this.gameLoop();
        this.handleSockets();
    }
    gameLoop() {
        setInterval(() => {
            this.game.upgradeGrid();
            this.io.to('game_room').emit('update_pack', this.game.nextGenPack);
        }, 1000 / this.game.tickSpeed);
    }
    handleSockets() {
        this.io.on('connection', socket => {
            console.log(`Socket ${socket.id} has connected to the server!`);
            socket.join('game_room');
            socket.emit('init_pack', this.game.initPack);
            socket.on('create_pattern', ({ pattern, offsetRow, offsetCol }) => {
                if (!Number.isInteger(offsetRow) || !Number.isInteger(offsetCol))
                    return;
                if (!Array.isArray(pattern))
                    return;
                if (pattern.length !== 5)
                    return;
                for (let i = 0; i < pattern.length; i++) {
                    if (pattern[i].length !== 5)
                        return;
                }
                this.game.addPattern(pattern, offsetRow, offsetCol);
            });
            socket.on('disconnect', () => {
                console.log(`Socket ${socket.id} has left the server!`);
            });
        });
    }
}
new App();
