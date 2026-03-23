import React, { useMemo } from 'react';
import type { Pokemon } from '../types/game';

interface GameOverProps {
  winner: 1 | 2 | null;
  myPlayerNum: 1 | 2 | null;
  secretPokemon1: Pokemon | null;
  secretPokemon2: Pokemon | null;
}

const GameOver: React.FC<GameOverProps> = ({
  winner,
  myPlayerNum,
  secretPokemon1,
  secretPokemon2
}) => {
  const isWinner = winner === myPlayerNum;
  const opponentSecret = myPlayerNum === 1 ? secretPokemon2 : secretPokemon1;

  const winnerConfetti = useMemo(() => {
    return [...Array(150)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 4}s`,
      duration: `${3 + Math.random() * 2}s`,
      scale: 0.5 + Math.random() * 1.2
    }));
  }, []);

  const loserSparkles = useMemo(() => {
    return [...Array(80)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${100 + Math.random() * 20}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${2 + Math.random() * 2}s`
    }));
  }, []);

  return (
    <>
      {isWinner ? (
        <div className="confetti-container">
          {winnerConfetti.map((c) => (
            <div 
              key={c.id} 
              className={`confetti paper c${c.id % 6}`} 
              style={{ 
                left: c.left,
                animationDelay: c.delay,
                animationDuration: c.duration,
                transform: `scale(${c.scale})`
              }} 
            />
          ))}
        </div>
      ) : (
        <div className="defeat-overlay" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
          {loserSparkles.map((s) => (
            <div 
              key={s.id} 
              className="sparkle-particle" 
              style={{ 
                left: s.left, 
                top: s.top,
                animationDelay: s.delay, 
                animationDuration: s.duration 
              }} 
            />
          ))}
        </div>
      )}

      <div className="victory-overlay">
        <div className="victory-card-epic">
          <h1 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>
            {isWinner ? "🏆 ¡GANASTE! 🏆" : "💫 ¡CASI LO LOGRAS! 💫"}
          </h1>
          <img 
            src={opponentSecret?.image} 
            className={`winner-image ${!isWinner ? 'loser-image' : ''}`} 
            alt="Pokemon" 
            style={{ width: '300px', height: '300px' }}
          />
          <p style={{ fontSize: '1.4rem' }}>El Pokémon rival era <br/><span style={{ fontSize: '2.4rem', color: '#facc15' }}>{opponentSecret?.name}</span></p>
          <button 
            onClick={() => window.location.reload()} 
            className="play-again-btn"
            style={{ marginTop: '25px', padding: '18px 35px' }}
          >
            NUEVA PARTIDA
          </button>
        </div>
      </div>
    </>
  );
};

export default GameOver;
