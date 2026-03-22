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
        io.to(roomCode).emit('game-ready', { players: game.players });
        
        // Si ya hay un estado de juego (ej. por reconexión o inicio rápido), lo enviamos
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

      // Si no hay estado previo, aceptamos el entrante (útil para inicio)
      if (!activeGames[roomCode].gameState) {
        activeGames[roomCode].gameState = incoming;
        socket.to(roomCode).emit('update-game-state', incoming);
        return;
      }

      // Base: empezamos con el estado actual del servidor
      const merged = { ...current };

      // Fase, Turno y Ganador: El último cambio válido manda
      if (incoming.phase) merged.phase = incoming.phase;
      if (incoming.turn) merged.turn = incoming.turn;
      if (incoming.winner !== undefined) merged.winner = incoming.winner;

      // Secretos: Solo el dueño puede establecer su propio secreto
      if (playerNum === 1 && incoming.secretPokemon1) merged.secretPokemon1 = incoming.secretPokemon1;
      if (playerNum === 2 && incoming.secretPokemon2) merged.secretPokemon2 = incoming.secretPokemon2;
      
      // Asegurar que no perdemos secretos ya guardados si el incoming viene con null
      if (current.secretPokemon1 && !merged.secretPokemon1) merged.secretPokemon1 = current.secretPokemon1;
      if (current.secretPokemon2 && !merged.secretPokemon2) merged.secretPokemon2 = current.secretPokemon2;

      // Tablero 1: P1 es dueño del contenido (Pokémon), P2 es dueño de las tachaduras (flips)
      if (incoming.board1) {
        merged.board1 = merged.board1.map((item, i) => {
          const incItem = incoming.board1[i];
          return {
            pokemon: playerNum === 1 ? (incItem?.pokemon || item.pokemon) : item.pokemon,
            isFlipped: playerNum === 2 ? (incItem?.isFlipped ?? item.isFlipped) : item.isFlipped
          };
        });
      }

      // Tablero 2: P2 es dueño del contenido, P1 es dueño de las tachaduras
      if (incoming.board2) {
        merged.board2 = merged.board2.map((item, i) => {
          const incItem = incoming.board2[i];
          return {
            pokemon: playerNum === 2 ? (incItem?.pokemon || item.pokemon) : item.pokemon,
            isFlipped: playerNum === 1 ? (incItem?.isFlipped ?? item.isFlipped) : item.isFlipped
          };
        });
      }

      activeGames[roomCode].gameState = merged;
      // Enviamos el estado fusionado a los demás
      socket.to(roomCode).emit('update-game-state', merged);
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
