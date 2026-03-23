import React, { useState } from 'react';
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

  const [winnerStars] = useState(() => {
    if (winner !== myPlayerNum) return [];
    return [...Array(60)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${3 + Math.random() * 2}s`
    }));
  });

  const [loserOrbs] = useState(() => {
    if (winner === myPlayerNum) return [];
    return [...Array(40)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${100 + Math.random() * 20}%`,
      delay: `${Math.random() * 4}s`
    }));
  });

  return (
    <>
      <div className="victory-overlay">
        {isWinner ? (
          <div className="confetti-container">
            {winnerStars.map((star) => (
              <div 
                key={star.id} 
                className="particle-star" 
                style={{ 
                  left: star.left, 
                  animationDelay: star.delay, 
                  animationDuration: star.duration 
                }} 
              />
            ))}
          </div>
        ) : (
          <div className="confetti-container">
            {loserOrbs.map((orb) => (
              <div 
                key={orb.id} 
                className="particle-orb" 
                style={{ 
                  left: orb.left, 
                  top: orb.top,
                  animationDelay: orb.delay 
                }} 
              />
            ))}
          </div>
        )}

        <div className="victory-card-epic">
          <h1>{isWinner ? "🏆 ¡LO LOGRASTE! 🏆" : "🌟 BUEN INTENTO 🌟"}</h1>
          <img 
            src={opponentSecret?.image} 
            className="winner-image" 
            alt="Pokemon" 
            style={{ width: '280px', height: '280px' }}
          />
          <p style={{ margin: '15px 0', fontSize: '1.2rem', opacity: 0.9 }}>El Pokémon secreto era</p>
          <h2 style={{ fontSize: '2.5rem', color: '#facc15', textTransform: 'uppercase', marginBottom: '20px' }}>
            {opponentSecret?.name}
          </h2>
          <button 
            onClick={() => window.location.reload()} 
            className="play-again-btn"
          >
            NUEVA PARTIDA
          </button>
        </div>
      </div>
    </>
  );
};

export default GameOver;
