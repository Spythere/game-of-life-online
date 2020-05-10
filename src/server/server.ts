import express from 'express';
import path from 'path';
import io from 'socket.io';
import http from 'http';

import { Game } from './game';

class User {
    id: String
    token!: String

    constructor(id: String) {
        this.id = id;
    }
}

class App {
    server: http.Server
    app: express.Application
    io: SocketIO.Server
    PORT: string | number = process.env.PORT || 2000
    game: Game

    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = io(this.server);
        this.game = new Game()

        this.app.use(express.static(path.resolve(__dirname, './public')));

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

    handleSockets(): void {
        this.io.on('connection', socket => {
            console.log(`Socket ${socket.id} has connected to the server!`);

            socket.join('game_room');
            socket.emit('init_pack', this.game.initPack);

            socket.on('create_pattern', ({ pattern, offsetRow, offsetCol }) => {
                if (!Number.isInteger(offsetRow) || !Number.isInteger(offsetCol)) return;
                if (!Array.isArray(pattern)) return;
                if (pattern.length !== 5) return;

                for (let i = 0; i < pattern.length; i++) {
                    if (pattern[i].length !== 5) return;
                }

                this.game.addPattern(pattern, offsetRow, offsetCol);
            })

            socket.on('disconnect', () => {
                console.log(`Socket ${socket.id} has left the server!`);
            })
        });
    }
}

new App();