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
      const currentGameState = activeGames[roomCode].gameState || {};
      
      // Fusionar estados para no perder secretos de otros jugadores
      const mergedState = { ...currentGameState, ...gameState };
      
      // Preservar secretos si el nuevo estado viene con nulls (típico si un jugador aún no tiene el secreto del otro)
      if (currentGameState.secretPokemon1 && !gameState.secretPokemon1) mergedState.secretPokemon1 = currentGameState.secretPokemon1;
      if (currentGameState.secretPokemon2 && !gameState.secretPokemon2) mergedState.secretPokemon2 = currentGameState.secretPokemon2;
      
      // No permitir volver de 'playing' a 'setup' si ya se inició
      if (currentGameState.phase === 'playing' && gameState.phase === 'setup') {
        mergedState.phase = 'playing';
      }

      activeGames[roomCode].gameState = mergedState;
      // Enviamos el estado fusionado a TODOS en la sala menos al que lo mandó
      socket.to(roomCode).emit('update-game-state', mergedState);
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
