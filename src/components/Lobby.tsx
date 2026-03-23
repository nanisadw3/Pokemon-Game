import React from 'react';

interface LobbyProps {
  roomCode: string;
  setRoomCode: (code: string) => void;
  createGame: () => void;
  joinGame: () => void;
  isWaitingForOpponent: boolean;
}

const Lobby: React.FC<LobbyProps> = ({ 
  roomCode, 
  setRoomCode, 
  createGame, 
  joinGame, 
  isWaitingForOpponent 
}) => {
  return (
    <div className="lobby-container">
      <h1>Pokémon Guess Who Multiplayer</h1>
      <div className="lobby-box">
        <input 
          type="text" 
          placeholder="CÓDIGO SALA" 
          value={roomCode} 
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())} 
          maxLength={6} 
        />
        <div className="lobby-buttons">
          <button onClick={createGame} className="create-btn">CREAR</button>
          <button onClick={joinGame} className="join-btn">UNIRSE</button>
        </div>
        {isWaitingForOpponent && (
          <div className="waiting-msg">
            <div className="pokeball-loading"></div>
            <p>SALA: <span className="room-code-display">{roomCode}</span></p>
            <p className="status-blink">Esperando a tu rival...</p>
          </div>
        )}
      </div>
      <div className="lobby-footer">
        <p>Pokémon Guess Who Multiplayer</p>
        <p>Desarrollado por <strong>Inaki Sobera Sotomayor</strong></p>
      </div>
    </div>
  );
};

export default Lobby;
