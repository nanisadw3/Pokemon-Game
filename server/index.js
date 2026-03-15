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
      activeGames[roomCode].gameState = gameState;
      // Enviamos el estado a TODOS en la sala menos al que lo mandó
      socket.to(roomCode).emit('update-game-state', gameState);
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
