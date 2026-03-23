const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Permitir cualquier origen por ahora
    methods: ["GET", "POST"]
  }
});

// Almacén de partidas activas (en memoria)
// En un futuro esto se podría guardar en una base de datos de DigitalOcean
const activeGames = {};

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  // Crear una nueva partida
  socket.on('create-game', (roomCode) => {
    socket.join(roomCode);
    activeGames[roomCode] = {
      players: [socket.id],
      gameState: null,
      messages: []
    };
    console.log(`Partida creada en sala: ${roomCode}`);
  });

  // Unirse a una partida existente
  socket.on('join-game', (roomCode) => {
    const game = activeGames[roomCode];
    if (game) {
      if (game.players.length < 2) {
        socket.join(roomCode);
        game.players.push(socket.id);
        
        // Avisar a todos que el juego está listo
        io.to(roomCode).emit('game-ready', { players: game.players });
        
        // Si ya hay un estado de juego, lo enviamos inmediatamente al que se une
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

  // Sincronizar el estado del juego (tableros, secretos, etc.)
  socket.on('sync-game-state', ({ roomCode, gameState }) => {
    if (activeGames[roomCode]) {
      const playerNum = activeGames[roomCode].players.indexOf(socket.id) + 1;
      const current = activeGames[roomCode].gameState || {};
      const incoming = gameState;

      // Base: empezamos con el estado actual del servidor
      const merged = { ...current, ...incoming };

      // Secretos: Solo el dueño puede establecer su propio secreto
      if (playerNum === 1) {
        merged.secretPokemon1 = incoming.secretPokemon1 || current.secretPokemon1;
        merged.secretPokemon2 = current.secretPokemon2;
      } else {
        merged.secretPokemon2 = incoming.secretPokemon2 || current.secretPokemon2;
        merged.secretPokemon1 = current.secretPokemon1;
      }

      // Función auxiliar para fusionar tableros sin perder longitud ni datos
      const mergeBoard = (currentBoard, incomingBoard, isOwner) => {
        if (!incomingBoard) return currentBoard;
        if (!currentBoard) return incomingBoard;

        const maxLength = Math.max(currentBoard.length, incomingBoard.length);
        const result = [];
        for (let i = 0; i < maxLength; i++) {
          const cur = currentBoard[i];
          const inc = incomingBoard[i];
          
          result.push({
            // El dueño del tablero manda en el pokemon, el otro manda en el isFlipped
            pokemon: isOwner ? (inc?.pokemon || cur?.pokemon) : (cur?.pokemon || inc?.pokemon),
            isFlipped: isOwner ? (cur?.isFlipped ?? inc?.isFlipped) : (inc?.isFlipped ?? cur?.isFlipped)
          });
        }
        return result;
      };

      merged.board1 = mergeBoard(current.board1, incoming.board1, playerNum === 1);
      merged.board2 = mergeBoard(current.board2, incoming.board2, playerNum === 2);

      activeGames[roomCode].gameState = merged;
      // Enviamos el estado fusionado a TODOS en la sala (incluyendo al emisor para confirmar)
      io.to(roomCode).emit('update-game-state', merged);
    }
  });

  // Permitir que un jugador pida el estado actual si se quedó atrás
  socket.on('request-game-state', (roomCode) => {
    const game = activeGames[roomCode];
    if (game && game.gameState) {
      socket.emit('update-game-state', game.gameState);
    }
  });

  // Enviar mensaje de chat
  socket.on('send-chat-msg', ({ roomCode, message }) => {
    if (activeGames[roomCode]) {
      activeGames[roomCode].messages.push(message);
      // Reenviar a todos en la sala
      io.to(roomCode).emit('receive-chat-msg', message);
    }
  });

  // Al desconectarse
  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
    // Podríamos añadir lógica para cerrar salas vacías aquí
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor multijugador corriendo en el puerto ${PORT}`);
});
