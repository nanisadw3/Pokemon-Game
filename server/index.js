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

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  socket.on('create-game', (roomCode) => {
    socket.join(roomCode);
    activeGames[roomCode] = {
      players: [socket.id],
      gameState: null,
      messages: []
    };
    console.log(`Partida creada en sala: ${roomCode}`);
  });

  socket.on('join-game', (roomCode) => {
    const game = activeGames[roomCode];
    if (game) {
      if (game.players.length < 2) {
        socket.join(roomCode);
        game.players.push(socket.id);
        io.to(roomCode).emit('game-ready', { players: game.players });
        if (game.gameState) {
          socket.emit('update-game-state', game.gameState);
        }
        console.log(`Usuario unido a sala: ${roomCode}`);
      } else {
        socket.emit('error-msg', 'La sala está llena.');
      }
    } else {
      socket.emit('error-msg', 'La sala no existe.');
    }
  });

  socket.on('sync-game-state', ({ roomCode, gameState }) => {
    if (activeGames[roomCode]) {
      const playerNum = activeGames[roomCode].players.indexOf(socket.id) + 1;
      const current = activeGames[roomCode].gameState || {};
      const incoming = gameState;

      const merged = { ...current, ...incoming };

      // Secretos
      if (playerNum === 1) {
        merged.secretPokemon1 = incoming.secretPokemon1 || current.secretPokemon1;
        merged.secretPokemon2 = current.secretPokemon2;
      } else {
        merged.secretPokemon2 = incoming.secretPokemon2 || current.secretPokemon2;
        merged.secretPokemon1 = current.secretPokemon1;
      }

      // Si el host (Player 1) manda el estado de "playing", aceptamos los tableros tal cual
      // Esto evita que el filtro de "propiedad" bloquee el inicio del juego 5x5
      if (incoming.phase === 'playing' && playerNum === 1) {
        merged.board1 = incoming.board1;
        merged.board2 = incoming.board2;
      } else {
        // Lógica de mezcla normal para cuando ya están jugando (tachando cartas)
        const mergeBoard = (currentBoard, incomingBoard, isOwner) => {
          if (!incomingBoard) return currentBoard;
          if (!currentBoard) return incomingBoard;

          const maxLength = Math.max(currentBoard.length, incomingBoard.length);
          const result = [];
          for (let i = 0; i < maxLength; i++) {
            const cur = currentBoard[i];
            const inc = incomingBoard[i];
            result.push({
              // El dueño manda en el pokemon, el otro manda en el isFlipped
              pokemon: isOwner ? (inc?.pokemon || cur?.pokemon) : (cur?.pokemon || inc?.pokemon),
              isFlipped: isOwner ? (cur?.isFlipped ?? inc?.isFlipped) : (inc?.isFlipped ?? cur?.isFlipped)
            });
          }
          return result;
        };

        merged.board1 = mergeBoard(current.board1, incoming.board1, playerNum === 1);
        merged.board2 = mergeBoard(current.board2, incoming.board2, playerNum === 2);
      }

      activeGames[roomCode].gameState = merged;
      io.to(roomCode).emit('update-game-state', merged);
    }
  });

  socket.on('request-game-state', (roomCode) => {
    const game = activeGames[roomCode];
    if (game && game.gameState) {
      socket.emit('update-game-state', game.gameState);
    }
  });

  socket.on('send-chat-msg', ({ roomCode, message }) => {
    if (activeGames[roomCode]) {
      activeGames[roomCode].messages.push(message);
      io.to(roomCode).emit('receive-chat-msg', message);
    }
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor multijugador corriendo en el puerto ${PORT}`);
});
