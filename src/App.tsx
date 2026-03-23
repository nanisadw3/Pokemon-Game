import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import GameBoard from './components/GameBoard';
import PokemonCard from './components/PokemonCard';
import Lobby from './components/Lobby';
import Chat from './components/Chat';
import Setup from './components/Setup';
import GameOver from './components/GameOver';
import { getRandomPokemons, getAllPokemonNames, getPokemonDetails } from './services/pokemonService';
import type { Pokemon, GameState } from './types/game';
import { io, Socket } from 'socket.io-client';

const SOCKET_SERVER_URL = "https://oyster-app-xwu29.ondigitalocean.app";

interface ChatMessage {
  sender: 'player1' | 'player2' | 'system';
  text: string;
}

function App() {
  // UI States
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showSpy, setShowSpy] = useState(false);
  const [selectedAnim, setSelectedAnim] = useState<Pokemon | null>(null);
  const [isGuessMode, setIsGuessMode] = useState(false);
  const [gameAlert, setGameAlert] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatVisible, setChatVisible] = useState(true);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Game Data
  const [allNames, setAllNames] = useState<{name: string, url: string}[]>([]);
  const [globalResults, setGlobalResults] = useState<Pokemon[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  
  // Networking
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [myPlayerNum, setMyPlayerNum] = useState<1 | 2 | null>(null);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);

  // Refs for socket callbacks
  const roomCodeRef = useRef('');
  const myPlayerNumRef = useRef<1 | 2 | null>(null);
  const selectedAnimRef = useRef<Pokemon | null>(null);
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);

  const [gameState, setGameState] = useState<GameState>({
    board1: [],
    board2: [],
    secretPokemon1: null,
    secretPokemon2: null,
    turn: 1,
    phase: 'lobby',
    winner: null,
  });

  // Sync refs
  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);
  useEffect(() => { myPlayerNumRef.current = myPlayerNum; }, [myPlayerNum]);
  useEffect(() => { selectedAnimRef.current = selectedAnim; }, [selectedAnim]);

  // Initial Data Fetch
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const names = await getAllPokemonNames();
        setAllNames(names);
      } catch (e) {
        console.error("Error fetching names", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Global Search
  useEffect(() => {
    if (searchTerm.trim().length === 0 || gameState.phase !== 'setup') {
      setGlobalResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingGlobal(true);
      const filtered = allNames
        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase().trim()))
        .slice(0, 30);
      
      const details = await Promise.all(filtered.map(p => getPokemonDetails(p.url)));
      setGlobalResults(details.filter(p => p !== null) as Pokemon[]);
      setIsSearchingGlobal(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, gameState.phase, allNames]);

  const syncState = useCallback((newState: GameState) => {
    socketRef.current?.emit('sync-game-state', { roomCode: roomCodeRef.current, gameState: newState });
  }, []);

  const loadMorePokemons = useCallback(async () => {
    if (gameState.phase !== 'setup') return;
    if (loadingMore || searchTerm.trim().length > 0) return;
    
    setLoadingMore(true);
    try {
      const currentBoard = myPlayerNumRef.current === 1 ? gameState.board1 : gameState.board2;
      const excludeIds = currentBoard.map(item => item.pokemon.id);
      const moreData = await getRandomPokemons(30, excludeIds);
      const newItems = moreData.map(p => ({ pokemon: p, isFlipped: false }));
      
      setGameState(prev => {
        const boardKey = myPlayerNumRef.current === 1 ? 'board1' : 'board2';
        const newState = { ...prev, [boardKey]: [...prev[boardKey], ...newItems] };
        syncState(newState);
        return newState;
      });
    } catch (error) {
      console.error("Error loading more pokemons", error);
    } finally {
      setLoadingMore(false);
    }
  }, [gameState.board1, gameState.board2, gameState.phase, loadingMore, searchTerm, syncState]);

  const initGameMultiplayer = useCallback(async () => {
    setLoading(true);
    const allData = await getRandomPokemons(60);
    const p1 = allData.slice(0, 30);
    const p2 = allData.slice(30, 60);
    
    const initialState: GameState = {
      board1: p1.map(p => ({ pokemon: p, isFlipped: false })),
      board2: p2.map(p => ({ pokemon: p, isFlipped: false })),
      phase: 'setup',
      winner: null,
      secretPokemon1: null,
      secretPokemon2: null,
      turn: Math.random() < 0.5 ? 1 : 2
    };

    setGameState(initialState);
    syncState(initialState);
    setLoading(false);
  }, [syncState]);

  const generateFinalBoards = useCallback(async (state: GameState) => {
    if (myPlayerNumRef.current !== 1) return; 
    setLoading(true);

    try {
      // Pedimos una muestra mucho más grande de Pokémon aleatorios para que los tableros sean variados
      // Queremos llenar 2 tableros de 25-30 pokemons cada uno con opciones únicas
      const totalNeeded = 60; 
      const extraData = await getRandomPokemons(totalNeeded, [state.secretPokemon1!.id, state.secretPokemon2!.id]);
      
      // Mezclamos bien y repartimos
      const shuffledExtra = [...extraData].sort(() => Math.random() - 0.5);
      const extraForBoard2 = shuffledExtra.slice(0, 24);
      const extraForBoard1 = shuffledExtra.slice(24, 48);
      
      const pool2 = [state.secretPokemon2!, ...extraForBoard2].sort(() => Math.random() - 0.5);
      const pool1 = [state.secretPokemon1!, ...extraForBoard1].sort(() => Math.random() - 0.5);

      const finalState: GameState = {
        ...state,
        board1: pool1.map(p => ({ pokemon: p, isFlipped: false })),
        board2: pool2.map(p => ({ pokemon: p, isFlipped: false })),
        phase: 'playing'
      };

      setGameState(finalState);
      syncState(finalState);
    } catch (error) {
      console.error("Error generating final boards", error);
    } finally {
      setLoading(false);
    }
  }, [syncState]);

  useEffect(() => {
    if (gameState.phase === 'setup' && 
        gameState.secretPokemon1 && 
        gameState.secretPokemon2 && 
        !selectedAnim && 
        !loading) {
      if (myPlayerNum === 1) generateFinalBoards(gameState);
    }
  }, [gameState, selectedAnim, myPlayerNum, generateFinalBoards, loading]);

  useEffect(() => {
    if (gameState.phase === 'setup' && !loading) {
      const currentBoard = myPlayerNum === 1 ? gameState.board1 : gameState.board2;
      if (currentBoard.length === 0 && !loadingMore) {
        loadMorePokemons();
      }
    }
  }, [gameState.phase, gameState.board1, gameState.board2, myPlayerNum, loading, loadingMore, loadMorePokemons]);

  useEffect(() => {
    const newSocket: Socket = io(SOCKET_SERVER_URL, { transports: ['websocket'] });
    socketRef.current = newSocket;

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));

    newSocket.on('update-game-state', (newState: GameState) => {
      setGameState(prev => {
        const mergedState = { ...prev, ...newState };
        if (prev.secretPokemon1 && !newState.secretPokemon1) mergedState.secretPokemon1 = prev.secretPokemon1;
        if (prev.secretPokemon2 && !newState.secretPokemon2) mergedState.secretPokemon2 = prev.secretPokemon2;
        return mergedState;
      });
      setLoading(false);
    });

    newSocket.on('receive-chat-msg', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on('game-ready', () => {
      setIsWaitingForOpponent(false);
      setLoading(true);
      if (myPlayerNumRef.current === 1) {
        setTimeout(() => initGameMultiplayer(), 1000);
      } else {
        setTimeout(() => {
          socketRef.current?.emit('request-game-state', roomCodeRef.current);
        }, 2000);
      }
    });

    newSocket.on('error-msg', (err: string) => {
      alert(err);
      setLoading(false);
    });

    return () => { 
      newSocket.disconnect(); 
      socketRef.current = null;
    };
  }, [initGameMultiplayer]);

  const createGame = () => {
    let code = roomCode.trim();
    if (!code) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      setRoomCode(code);
    }
    socketRef.current?.emit('create-game', code);
    setIsWaitingForOpponent(true);
    setMyPlayerNum(1);
  };

  const joinGame = () => {
    if (!roomCode.trim()) return alert("Ingresa un código de sala");
    socketRef.current?.emit('join-game', roomCode);
    setMyPlayerNum(2);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
      loadMorePokemons();
    }
  };

  const handleSelectSecret = (pokemon: Pokemon) => {
    setSelectedAnim(pokemon);
    setSearchTerm('');
    setGlobalResults([]);
    
    setGameState(prev => {
      const newState = { ...prev };
      if (myPlayerNum === 1) newState.secretPokemon1 = pokemon;
      else newState.secretPokemon2 = pokemon;
      syncState(newState);
      return newState;
    });

    setTimeout(() => {
      setSelectedAnim(null);
    }, 2500);
  };

  const sendSystemMsg = useCallback((text: string) => {
    socketRef.current?.emit('send-chat-msg', { roomCode: roomCodeRef.current, message: { sender: 'system', text } });
  }, []);

  const handleCardClick = (index: number) => {
    if (gameState.phase !== 'playing' || gameState.turn !== myPlayerNum) return;
    
    const boardKey = myPlayerNum === 1 ? 'board2' : 'board1';
    const clickedPokemon = gameState[boardKey][index].pokemon;

    if (isGuessMode) {
      const opponentSecret = myPlayerNum === 1 ? gameState.secretPokemon2 : gameState.secretPokemon1;
      
      if (clickedPokemon.id === opponentSecret?.id) {
        const winState = { ...gameState, phase: 'gameover' as const, winner: myPlayerNum };
        setGameState(winState);
        syncState(winState);
      } else {
        // FALLO AL ADIVINAR: Tachar automáticamente y cambiar de turno
        const nextTurn = myPlayerNum === 1 ? 2 : 1;
        
        setGameState(prev => {
          const newState = { ...prev };
          const failBoard = [...newState[boardKey]];
          // Simplemente giramos la carta (mostrando la Pokéball)
          failBoard[index] = { ...failBoard[index], isFlipped: true, isWrong: false };
          newState[boardKey] = failBoard;
          newState.turn = nextTurn;
          
          syncState(newState);
          return newState;
        });

        setIsGuessMode(false);
        sendSystemMsg(`¡Vaya! Falló al intentar adivinar a ${clickedPokemon.name}. Turno de rival.`);
      }
    } else {
      setGameState(prev => {
        const newState = { ...prev };
        const board = [...newState[boardKey]];
        board[index] = { ...board[index], isFlipped: !board[index].isFlipped };
        newState[boardKey] = board;
        syncState(newState);
        sendSystemMsg(`${board[index].isFlipped ? 'Tachó' : 'Des-tachó'} a ${clickedPokemon.name}.`);
        return newState;
      });
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    socketRef.current?.emit('send-chat-msg', { 
      roomCode: roomCodeRef.current, 
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

  if (loading) return (
    <div className="loading">
      <div className="pokeball-loading"></div>
      <h2>Cargando aventura...</h2>
    </div>
  );

  if (gameState.phase === 'lobby') {
    return (
      <Lobby 
        roomCode={roomCode} 
        setRoomCode={setRoomCode} 
        createGame={createGame} 
        joinGame={joinGame} 
        isWaitingForOpponent={isWaitingForOpponent} 
      />
    );
  }

  return (
    <div className="app-container">
      {!isConnected && <div className="connection-error">⚠️ Desconectado del servidor...</div>}
      
      {selectedAnim && (
        <div className="selection-overlay">
          <div className="anim-content">
            <h2>¡TE ELIJO A TI!</h2>
            <img src={selectedAnim.image} alt={selectedAnim.name} className="anim-image" />
            <h1 className="anim-name">{selectedAnim.name}</h1>
          </div>
        </div>
      )}

      {gameAlert && (
        <div className="game-alert-overlay">
          <div className="game-alert-box">
            <h3>{gameAlert.title}</h3>
            <p>{gameAlert.message}</p>
            <button onClick={gameAlert.onConfirm}>CONTINUAR</button>
          </div>
        </div>
      )}

      {gameState.phase === 'setup' ? (
        <Setup 
          myPlayerNum={myPlayerNum}
          board={myPlayerNum === 1 ? gameState.board1 : gameState.board2}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          isSearchingGlobal={isSearchingGlobal}
          globalResults={globalResults}
          loadingMore={loadingMore}
          handleScroll={handleScroll}
          handleSelectSecret={handleSelectSecret}
          secretPokemon={myPlayerNum === 1 ? gameState.secretPokemon1 : gameState.secretPokemon2}
        />
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
                {showSecret && (myPlayerNum === 1 ? gameState.secretPokemon1 : gameState.secretPokemon2) && (
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
        <GameOver 
          winner={gameState.winner} 
          myPlayerNum={myPlayerNum} 
          secretPokemon1={gameState.secretPokemon1} 
          secretPokemon2={gameState.secretPokemon2} 
        />
      )}

      <Chat 
        chatVisible={chatVisible}
        setChatVisible={setChatVisible}
        isChatMinimized={isChatMinimized}
        setIsChatMinimized={setIsChatMinimized}
        chatInput={chatInput}
        setChatInput={setChatInput}
        messages={messages}
        myPlayerNum={myPlayerNum}
        handleSendMessage={handleSendMessage}
        chatMessagesRef={chatMessagesRef}
      />
    </div>
  );
}

export default App;
