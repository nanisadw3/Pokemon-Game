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

  const confettiItems = useMemo(() => {
    // Generar valores deterministas basados en el índice
    return [...Array(100)].map((_, i) => ({
      id: i,
      left: `${(i * 7.7) % 100}%`,
      delay: `${(i * 0.13) % 4}s`,
      opacity: 0.5 + ((i * 0.1) % 0.5)
    }));
  }, []);

  return (
    <>
      {isWinner && (
        <div className="confetti-container">
          {confettiItems.map((item) => (
            <div 
              key={item.id} 
              className={`confetti c${item.id % 6}`} 
              style={{ 
                left: item.left, 
                animationDelay: item.delay,
                opacity: item.opacity
              }} 
            />
          ))}
        </div>
      )}
      <div className="victory-overlay">
        <div className="victory-card-epic">
          <h1>{isWinner ? "🏆 ¡GANASTE! 🏆" : "💀 PERDISTE..."}</h1>
          <img src={opponentSecret?.image} className="winner-image" alt="Winner" />
          <p>Era <span>{opponentSecret?.name}</span></p>
          <button onClick={() => window.location.reload()} className="play-again-btn">INICIO</button>
        </div>
      </div>
    </>
  );
};

export default GameOver;
