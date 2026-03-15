import { useState, useEffect, useRef } from 'react';
import './App.css';
import GameBoard from './components/GameBoard';
import PokemonCard from './components/PokemonCard';
import { getRandomPokemons } from './services/pokemonService';
import type { Pokemon, GameState } from './types/game';
import { io, Socket } from 'socket.io-client';

const SOCKET_SERVER_URL = "https://oyster-app-xwu29.ondigitalocean.app";

interface ChatMessage {
  sender: 'player1' | 'player2' | 'system';
  text: string;
}

function App() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [selectedAnim, setSelectedAnim] = useState<Pokemon | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isGuessMode, setIsGuessMode] = useState(false);
  const [gameAlert, setGameAlert] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatVisible, setChatVisible] = useState(true);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [chatInput, setChatInput] = useState('');
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [myPlayerNum, setMyPlayerNum] = useState<1 | 2 | null>(null);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);

  const [gameState, setGameState] = useState<GameState>({
    board1: [],
    board2: [],
    secretPokemon1: null,
    secretPokemon2: null,
    turn: 1,
    phase: 'lobby',
    winner: null,
  });
  
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const newSocket: Socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket']
    });
    setSocket(newSocket);

    newSocket.on('update-game-state', (newState: GameState) => {
      setGameState(newState);
    });

    newSocket.on('receive-chat-msg', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on('game-ready', () => {
      setIsWaitingForOpponent(false);
      initGameMultiplayer();
    });

    newSocket.on('error-msg', (err: string) => {
      alert(err);
      setLoading(false);
    });

    return () => { newSocket.disconnect(); };
  }, []);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages, isChatMinimized, chatVisible]);

  const createGame = () => {
    if (!roomCode.trim()) return alert("Escribe un código de sala");
    setMyPlayerNum(1);
    setIsWaitingForOpponent(true);
    socket?.emit('create-game', roomCode);
  };

  const joinGame = () => {
    if (!roomCode.trim()) return alert("Escribe un código de sala");
    setMyPlayerNum(2);
    socket?.emit('join-game', roomCode);
  };

  const initGameMultiplayer = async () => {
    if (myPlayerNum === 2) return;

    setLoading(true);
    const allData = await getRandomPokemons(50);
    const p1 = allData.slice(0, 25);
    const p2 = allData.slice(25, 50);
    
    const initialState: GameState = {
      board1: p1.map(p => ({ pokemon: p, isFlipped: false })),
      board2: p2.map(p => ({ pokemon: p, isFlipped: false })),
      phase: 'setup',
      winner: null,
      secretPokemon1: null,
      secretPokemon2: null,
      turn: 1
    };

    setGameState(initialState);
    syncState(initialState);
    setLoading(false);
  };

  const refreshBoard = async () => {
    setRefreshing(true);
    const newData = await getRandomPokemons(25);
    const newState = { ...gameState };
    
    if (myPlayerNum === 1) {
      newState.board1 = newData.map(p => ({ pokemon: p, isFlipped: false }));
      newState.secretPokemon1 = null;
    } else {
      newState.board2 = newData.map(p => ({ pokemon: p, isFlipped: false }));
      newState.secretPokemon2 = null;
    }

    setGameState(newState);
    syncState(newState);
    setRefreshing(false);
  };

  const syncState = (newState: GameState) => {
    socket?.emit('sync-game-state', { roomCode, gameState: newState });
  };

  const handleSelectSecret = (pokemon: Pokemon) => {
    setSelectedAnim(pokemon);
    setTimeout(() => {
      setSelectedAnim(null);
      const newState = { ...gameState };
      if (myPlayerNum === 1) newState.secretPokemon1 = pokemon;
      else newState.secretPokemon2 = pokemon;

      if (newState.secretPokemon1 && newState.secretPokemon2) {
        newState.phase = 'playing';
        sendSystemMsg("¡Duelo iniciado! Adivina el Pokémon del rival.");
      }

      setGameState(newState);
      syncState(newState);
    }, 2000);
  };

  const handleCardClick = (index: number) => {
    if (gameState.phase !== 'playing' || gameState.turn !== myPlayerNum) return;
    
    const newState = { ...gameState };
    const board = myPlayerNum === 1 ? newState.board2 : newState.board1;
    if (!board[index]) return;
    
    const clickedPokemon = board[index].pokemon;

    if (isGuessMode) {
      const opponentSecret = myPlayerNum === 1 ? gameState.secretPokemon2 : gameState.secretPokemon1;
      if (clickedPokemon.id === opponentSecret?.id) {
        newState.phase = 'gameover';
        newState.winner = myPlayerNum;
      } else {
        setGameAlert({
          title: "¡ERROR!",
          message: `El Pokémon de él no es ${clickedPokemon.name}.`,
          onConfirm: () => {
            setGameAlert(null);
            board[index].isFlipped = true;
            newState.turn = myPlayerNum === 1 ? 2 : 1;
            setIsGuessMode(false);
            setGameState({ ...newState });
            syncState(newState);
            sendSystemMsg(`¡Vaya! Fallaste al adivinar a ${clickedPokemon.name}.`);
          }
        });
        return;
      }
    } else {
      board[index].isFlipped = !board[index].isFlipped;
      sendSystemMsg(`${board[index].isFlipped ? 'Tachó' : 'Des-tachó'} a ${clickedPokemon.name}.`);
    }

    setGameState(newState);
    syncState(newState);
  };

  const sendSystemMsg = (text: string) => {
    socket?.emit('send-chat-msg', { roomCode, message: { sender: 'system', text } });
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    socket?.emit('send-chat-msg', { 
      roomCode, 
      message: { sender: myPlayerNum === 1 ? 'player1' : 'player2', text: chatInput } 
    });
    setChatInput('');
  };

  const handleEndTurn = () => {
    const newState = { ...gameState, turn: myPlayerNum === 1 ? 2 : 1 };
    setGameState(newState);
    syncState(newState);
    setIsGuessMode(false);
    sendSystemMsg(`--- Cambio de Turno ---`);
  };

  if (loading) return <div className="loading"><div className="pokeball-loading"></div><p>Cargando aventura...</p></div>;

  if (gameState.phase === 'lobby') {
    return (
      <div className="lobby-container">
        <h1>Pokémon Guess Who Multiplayer</h1>
        <div className="lobby-box">
          <input type="text" placeholder="CÓDIGO SALA" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} maxLength={6} />
          <div className="lobby-buttons">
            <button onClick={createGame} className="create-btn">CREAR</button>
            <button onClick={joinGame} className="join-btn">UNIRSE</button>
          </div>
          {isWaitingForOpponent && <div className="waiting-msg"><div className="pokeball-loading mini"></div><p>Esperando rival... (SALA: {roomCode})</p></div>}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {gameAlert && (
        <div className="game-alert-overlay">
          <div className="game-alert-box">
            <h3>{gameAlert.title}</h3>
            <p>{gameAlert.message}</p>
            <button onClick={gameAlert.onConfirm}>CONTINUAR</button>
          </div>
        </div>
      )}

      {selectedAnim && (
        <div className="selection-overlay">
          <div className="anim-content">
            <h2>¡TE ELIJO A TI!</h2>
            <img src={selectedAnim.image} alt={selectedAnim.name} className="anim-image" />
            <h1 className="anim-name">{selectedAnim.name}</h1>
          </div>
        </div>
      )}

      {gameState.phase === 'setup' ? (
        <div className="setup-container">
          <div className="setup-header">
            <h1>Preparación J{myPlayerNum}</h1>
            <button onClick={refreshBoard} className={`refresh-btn ${refreshing ? 'spinning' : ''}`} disabled={refreshing}>
              🔄 CAMBIAR POKÉMON
            </button>
          </div>
          <h2>Elige TU Pokémon secreto de este tablero</h2>
          <div className="selection-grid">
            {(myPlayerNum === 1 ? gameState.board1 : gameState.board2).map(item => (
              <PokemonCard key={item.pokemon.id} pokemon={item.pokemon} isFlipped={false} onClick={() => handleSelectSecret(item.pokemon)} />
            ))}
          </div>
          {(myPlayerNum === 1 ? gameState.secretPokemon1 : gameState.secretPokemon2) && (
            <div className="setup-waiting"><p>Esperando al otro jugador...</p></div>
          )}
        </div>
      ) : (
        <>
          <header>
            <div className="header-left"><h1>Sala: {roomCode}</h1></div>
            <div className="turn-indicator">{gameState.turn === myPlayerNum ? "TU TURNO" : "TURNO RIVAL"}</div>
          </header>

          <div className="game-layout-single">
            <div className="player-section">
              <div className="secret-display">
                <button onClick={() => setShowSecret(!showSecret)} className="reveal-btn">
                  {showSecret ? 'Ocultar Mi Secreto' : 'Revelar Mi Secreto'}
                </button>
                {showSecret && (
                  <div className="secret-card-mini">
                    <PokemonCard pokemon={myPlayerNum === 1 ? gameState.secretPokemon1! : gameState.secretPokemon2!} isFlipped={false} onClick={() => {}} isSecret />
                  </div>
                )}
              </div>
              
              <GameBoard 
                title={isGuessMode ? "¡ADIVINA!" : "Tablero del Rival"} 
                board={myPlayerNum === 1 ? gameState.board2 : gameState.board1} 
                onCardClick={handleCardClick} 
                showNames={false} 
              />
              
              <div className="action-buttons">
                {gameState.turn === myPlayerNum && (
                  <>
                    <button onClick={handleEndTurn} className="done-btn">TERMINAR TURNO</button>
                    <button onClick={() => setIsGuessMode(!isGuessMode)} className={`finalize-btn ${isGuessMode ? 'guessing' : ''}`}>
                      {isGuessMode ? 'CANCELAR' : '¿SÉ QUIÉN ES?'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {gameState.phase === 'gameover' && (
        <div className="victory-overlay">
          <div className="victory-card-epic">
            <h1>{gameState.winner === myPlayerNum ? "🏆 ¡GANASTE! 🏆" : "💀 PERDISTE..."}</h1>
            <img src={myPlayerNum === 1 ? gameState.secretPokemon2?.image : gameState.secretPokemon1?.image} className="winner-image" alt="Winner" />
            <p>Era <span>{myPlayerNum === 1 ? gameState.secretPokemon2?.name : gameState.secretPokemon1?.name}</span></p>
            <button onClick={() => window.location.reload()} className="play-again-btn">INICIO</button>
          </div>
        </div>
      )}

      {chatVisible ? (
        <div className={`chat-container ${isChatMinimized ? 'minimized' : ''}`}>
          <div className="chat-header" onClick={() => setIsChatMinimized(!isChatMinimized)}>
            <span>{isChatMinimized ? '💬 Chat' : '💬 Chat Multijugador'}</span>
            {!isChatMinimized && <button onClick={(e) => { e.stopPropagation(); setChatVisible(false); }} style={{background:'none', border:'none', color:'#1e293b', cursor:'pointer', fontSize:'1.2rem', fontWeight:'bold'}}>×</button>}
          </div>
          {!isChatMinimized && (
            <>
              <div className="chat-messages" ref={chatMessagesRef}>
                {messages.length === 0 && <p className="message system">¡Suerte!</p>}
                {messages.map((m, i) => {
                  const isMe = (myPlayerNum === 1 && m.sender === 'player1') || (myPlayerNum === 2 && m.sender === 'player2');
                  return <div key={i} className={`message ${m.sender}`}>{m.sender !== 'system' && <strong>{isMe ? 'Tú: ' : 'Él: '}</strong>}{m.text}</div>;
                })}
              </div>
              <form className="chat-input-area" onSubmit={handleSendMessage}>
                <input type="text" placeholder="Escribe..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
                <button type="submit">OK</button>
              </form>
            </>
          )}
        </div>
      ) : <button className="toggle-chat-btn" onClick={() => setChatVisible(true)}>💬 Chat</button>}

      <footer className="app-footer">
        <p>© 2026 Inaki Sobera Sotomayor</p>
      </footer>
    </div>
  );
}

export default App;
