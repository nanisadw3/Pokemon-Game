const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const activeGames = {};

// Orden de importancia de las fases
const PHASE_ORDER = { 'lobby': 0, 'setup': 1, 'playing': 2, 'gameover': 3 };

io.on('connection', (socket) => {
  socket.on('create-game', (roomCode) => {
    socket.join(roomCode);
    activeGames[roomCode] = {
      players: [socket.id],
      gameState: null,
      messages: []
    };
  });

  socket.on('join-game', (roomCode) => {
    const game = activeGames[roomCode];
    if (game && game.players.length < 2) {
      socket.join(roomCode);
      game.players.push(socket.id);
      io.to(roomCode).emit('game-ready', { players: game.players });
      if (game.gameState) socket.emit('update-game-state', game.gameState);
    } else {
      socket.emit('error-msg', game ? 'La sala está llena.' : 'La sala no existe.');
    }
  });

  socket.on('sync-game-state', ({ roomCode, gameState }) => {
    const game = activeGames[roomCode];
    if (game) {
      const playerNum = game.players.indexOf(socket.id) + 1;
      const current = game.gameState || { phase: 'lobby' };
      const incoming = gameState;

      // 1. Prohibir que la fase retroceda
      if (PHASE_ORDER[incoming.phase] < PHASE_ORDER[current.phase]) {
        incoming.phase = current.phase;
      }

      const merged = { ...current, ...incoming };

      // 2. Manejo de secretos
      if (playerNum === 1) {
        merged.secretPokemon1 = incoming.secretPokemon1 || current.secretPokemon1;
        merged.secretPokemon2 = current.secretPokemon2;
      } else {
        merged.secretPokemon2 = incoming.secretPokemon2 || current.secretPokemon2;
        merged.secretPokemon1 = current.secretPokemon1;
      }

      // 3. Lógica de tableros 5x5 estricta
      if (merged.phase === 'playing') {
        // Si el host manda los tableros 5x5 por primera vez, los aceptamos ciegamente
        if (incoming.phase === 'playing' && incoming.board1?.length === 25) {
          merged.board1 = incoming.board1;
          merged.board2 = incoming.board2;
        } else {
          // Si ya estamos jugando, forzamos que el largo sea 25 y solo mezclamos flips
          const syncFlips = (curBoard, incBoard) => {
            if (!incBoard || incBoard.length !== 25) return curBoard;
            return curBoard.map((item, idx) => ({
              ...item,
              isFlipped: incBoard[idx].isFlipped
            }));
          };
          merged.board1 = syncFlips(current.board1, incoming.board1);
          merged.board2 = syncFlips(current.board2, incoming.board2);
        }
      } else {
        // En setup, los tableros pueden crecer con el scroll infinito
        merged.board1 = (playerNum === 1) ? incoming.board1 : current.board1;
        merged.board2 = (playerNum === 2) ? incoming.board2 : current.board2;
      }

      game.gameState = merged;
      io.to(roomCode).emit('update-game-state', merged);
    }
  });

  socket.on('request-game-state', (roomCode) => {
    const game = activeGames[roomCode];
    if (game && game.gameState) socket.emit('update-game-state', game.gameState);
  });

  socket.on('send-chat-msg', ({ roomCode, message }) => {
    if (activeGames[roomCode]) {
      activeGames[roomCode].messages.push(message);
      io.to(roomCode).emit('receive-chat-msg', message);
    }
  });

  socket.on('disconnect', () => {
    // Limpieza opcional
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
