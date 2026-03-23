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

  const fireworks = useMemo(() => {
    return [...Array(100)].map((_, i) => {
      const midY = `-${30 + Math.random() * 40}vh`; // Altura media
      const endY = `-${10 + Math.random() * 20}vh`; // Caída final
      const endX = `${(Math.random() - 0.5) * 60}vw`; // Dispersión lateral
      return {
        id: i,
        midY, endY, endX,
        left: `${20 + Math.random() * 60}%`, // Salen del centro-inferior
        delay: `${Math.random() * 2}s`,
        scale: 0.5 + Math.random() * 1.5,
      };
    });
  }, []);

  const stars = useMemo(() => {
    return [...Array(60)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${3 + Math.random() * 2}s`,
      color: ['#facc15', '#3b82f6', '#ef4444', '#22c55e', '#ffffff'][i % 5]
    }));
  }, []);

  return (
    <>
      {isWinner ? (
        <div className="confetti-container">
          {fireworks.map((fw) => (
            <div 
              key={fw.id} 
              className={`confetti firework c${fw.id % 6}`} 
              style={{ 
                left: fw.left,
                '--midY': fw.midY,
                '--endY': fw.endY,
                '--endX': fw.endX,
                animationDelay: fw.delay,
                transform: `scale(${fw.scale})`
              } as React.CSSProperties} 
            />
          ))}
        </div>
      ) : (
        <div className="defeat-overlay" style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
          {stars.map((star) => (
            <div 
              key={star.id} 
              className="star-particle" 
              style={{ 
                left: star.left, 
                animationDelay: star.delay, 
                animationDuration: star.duration,
                background: star.color,
                boxShadow: `0 0 10px ${star.color}`
              }} 
            />
          ))}
        </div>
      )}

      <div className="victory-overlay">
        <div className={`victory-card-epic ${!isWinner ? 'defeat-card' : ''}`}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>
            {isWinner ? "🏆 ¡VICTORIA MAGISTRAL! 🏆" : "🌟 ¡BUEN INTENTO! 🌟"}
          </h1>
          <img 
            src={opponentSecret?.image} 
            className="winner-image" 
            alt="Pokemon" 
            style={{ width: '280px', height: '280px' }}
          />
          <p style={{ fontSize: '1.5rem' }}>El Pokémon secreto era <br/><span style={{ fontSize: '2.5rem', color: '#facc15' }}>{opponentSecret?.name}</span></p>
          <button 
            onClick={() => window.location.reload()} 
            className="play-again-btn"
            style={{ marginTop: '30px', padding: '20px 40px', fontSize: '1.5rem' }}
          >
            VOLVER A JUGAR
          </button>
        </div>
      </div>
    </>
  );
};

export default GameOver;
