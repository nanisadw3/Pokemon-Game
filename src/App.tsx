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
  const [showSpy, setShowSpy] = useState(false);
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
      setGameState(prev => {
        const mergedState = { ...prev, ...newState };
        
        // Preservar secretos si ya los tenemos localmente y la actualización no los trae
        if (prev.secretPokemon1 && !newState.secretPokemon1) mergedState.secretPokemon1 = prev.secretPokemon1;
        if (prev.secretPokemon2 && !newState.secretPokemon2) mergedState.secretPokemon2 = prev.secretPokemon2;
        
        // Forzar transición a 'playing' si ambos secretos están presentes
        if (mergedState.secretPokemon1 && mergedState.secretPokemon2 && mergedState.phase === 'setup') {
          mergedState.phase = 'playing';
        }
        
        return mergedState;
      });
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

  // Minimizar chat automáticamente al iniciar el duelo
  useEffect(() => {
    if (gameState.phase === 'playing') {
      setIsChatMinimized(true);
    }
  }, [gameState.phase]);

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
    const boardItems = newData.map(p => ({ pokemon: p, isFlipped: false }));

    setGameState(prev => {
      const newState = { 
        ...prev, 
        [myPlayerNum === 1 ? 'board1' : 'board2']: boardItems,
        [myPlayerNum === 1 ? 'secretPokemon1' : 'secretPokemon2']: null 
      };
      syncState(newState);
      return newState;
    });
    setRefreshing(false);
  };

  const syncState = (newState: GameState) => {
    socket?.emit('sync-game-state', { roomCode, gameState: newState });
  };

  const handleSelectSecret = (pokemon: Pokemon) => {
    setSelectedAnim(pokemon);
    
    // Actualizar estado local y sincronizar inmediatamente para evitar race conditions
    setGameState(prev => {
      const newState = { ...prev };
      if (myPlayerNum === 1) newState.secretPokemon1 = pokemon;
      else newState.secretPokemon2 = pokemon;

      if (newState.secretPokemon1 && newState.secretPokemon2) {
        newState.phase = 'playing';
        sendSystemMsg("¡Duelo iniciado! Adivina el Pokémon del rival.");
      }

      syncState(newState);
      return newState;
    });

    setTimeout(() => {
      setSelectedAnim(null);
    }, 2000);
  };

  const handleCardClick = (index: number) => {
    if (gameState.phase !== 'playing' || gameState.turn !== myPlayerNum) return;
    
    const newState = { ...gameState };
    const board = myPlayerNum === 1 ? [...newState.board2] : [...newState.board1];
    
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
            const failState = { ...gameState };
            const failBoard = myPlayerNum === 1 ? [...failState.board2] : [...failState.board1];
            failBoard[index].isFlipped = true;
            if (myPlayerNum === 1) failState.board2 = failBoard;
            else failState.board1 = failBoard;
            failState.turn = myPlayerNum === 1 ? 2 : 1;
            setIsGuessMode(false);
            setGameState(failState);
            syncState(failState);
            sendSystemMsg(`¡Vaya! Fallaste al adivinar a ${clickedPokemon.name}.`);
          }
        });
        return;
      }
    } else {
      board[index].isFlipped = !board[index].isFlipped;
      sendSystemMsg(`${board[index].isFlipped ? 'Tachó' : 'Des-tachó'} a ${clickedPokemon.name}.`);
    }

    if (myPlayerNum === 1) newState.board2 = board;
    else newState.board1 = board;

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

  const renderContent = () => {
    if (loading) return (
      <div className="loading">
        <div className="pokeball-loading"></div>
        <h2>Cargando aventura...</h2>
      </div>
    );

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
            {isWaitingForOpponent && (
              <div className="waiting-msg">
                <div className="pokeball-loading"></div>
                <p>SALA: <span className="room-code-display">{roomCode}</span></p>
                <p className="status-blink">Esperando a tu rival...</p>
              </div>
            )}
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
          (myPlayerNum === 1 ? gameState.secretPokemon1 : gameState.secretPokemon2) ? (
            <div className="setup-waiting-fullscreen">
              <div className="pokeball-loading" style={{marginBottom: '40px'}}></div>
              <img 
                src={(myPlayerNum === 1 ? gameState.secretPokemon1 : gameState.secretPokemon2)?.image} 
                className="setup-waiting-pokemon"
                alt="Chosen Pokemon"
              />
              <p className="chosen-hint">HAS ELEGIDO A:</p>
              <h1 className="chosen-name">{(myPlayerNum === 1 ? gameState.secretPokemon1 : gameState.secretPokemon2)?.name}</h1>
              <h2 className="waiting-text-gradient">Esperando al Rival...</h2>
              <p style={{color: '#94a3b8', maxWidth: '400px'}}>El duelo comenzará en cuanto tu oponente elija su Pokémon secreto.</p>
            </div>
          ) : (
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
                  <PokemonCard 
                    key={item.pokemon.id} 
                    pokemon={item.pokemon} 
                    isFlipped={false} 
                    onClick={() => handleSelectSecret(item.pokemon)} 
                    showName={true}
                  />
                ))}
              </div>
            </div>
          )
        ) : (
          <>
            <header>
              <div className="header-left"><h1>Sala: {roomCode}</h1></div>
              <div className="turn-indicator">{gameState.turn === myPlayerNum ? "TU TURNO" : "TURNO RIVAL"}</div>
            </header>

            <div className="game-layout-single">
              <div className="player-section">
                <div className="secret-display">
                  <div className="secret-actions">
                    <button onClick={() => setShowSecret(!showSecret)} className="reveal-btn">
                      {showSecret ? '🙈 OCULTAR MI SECRETO' : '🔍 REVELAR MI SECRETO'}
                    </button>
                    <button onClick={() => setShowSpy(!showSpy)} className={`spy-btn ${showSpy ? 'active' : ''}`} title={showSpy ? 'Volver al juego' : 'Ver mi tablero'}>
                      {showSpy ? (
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 10a11 11 0 0 0 20 0" />
                          <path d="m7 15-1.5 3" />
                          <path d="m12 17v3" />
                          <path d="m17 15 1.5 3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {showSecret && (
                    <div className="secret-card-mini">
                      <PokemonCard 
                        pokemon={myPlayerNum === 1 ? gameState.secretPokemon1! : gameState.secretPokemon2!} 
                        isFlipped={false} 
                        onClick={() => {}} 
                        isSecret 
                        showName={true} 
                      />
                    </div>
                  )}
                </div>
                
                {showSpy ? (
                  <div className="spy-view-container">
                    <GameBoard 
                      title="Tablero del Rival" 
                      board={myPlayerNum === 1 ? gameState.board1 : gameState.board2} 
                      onCardClick={() => {}} 
                      showNames={true} 
                    />
                    <div className="spy-hint">⚠️ Estás viendo lo que tu rival ha tachado en tu tablero. No puedes mover nada aquí.</div>
                  </div>
                ) : (
                  <GameBoard 
                    title={isGuessMode ? "¡ADIVINA!" : "Mi Tablero"} 
                    board={myPlayerNum === 1 ? gameState.board2 : gameState.board1} 
                    onCardClick={handleCardClick} 
                    showNames={true} 
                  />
                )}
                
                <div className="action-buttons">
                  {gameState.turn === myPlayerNum && !showSpy && (
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
          <>
            {gameState.winner === myPlayerNum && (
              <div className="confetti-container">
                {[...Array(100)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`confetti c${i % 6}`} 
                    style={{ 
                      left: `${Math.random() * 100}%`, 
                      animationDelay: `${Math.random() * 4}s`,
                      opacity: Math.random()
                    }} 
                  />
                ))}
              </div>
            )}
            <div className="victory-overlay">
              <div className="victory-card-epic">
                <h1>{gameState.winner === myPlayerNum ? "🏆 ¡GANASTE! 🏆" : "💀 PERDISTE..."}</h1>
                <img src={myPlayerNum === 1 ? gameState.secretPokemon2?.image : gameState.secretPokemon1?.image} className="winner-image" alt="Winner" />
                <p>Era <span>{myPlayerNum === 1 ? gameState.secretPokemon2?.name : gameState.secretPokemon1?.name}</span></p>
                <button onClick={() => window.location.reload()} className="play-again-btn">INICIO</button>
              </div>
            </div>
          </>
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
      </div>
    );
  };

  return (
    <div className="main-wrapper">
      {renderContent()}
      <footer className="app-footer">
        <p>© 2026 Inaki Sobera Sotomayor</p>
      </footer>
    </div>
  );
}

export default App;
