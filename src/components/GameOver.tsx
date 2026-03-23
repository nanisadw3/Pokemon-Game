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
    return [...Array(150)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`, // Posición X aleatoria
      delay: `${Math.random() * 3}s`, // Retraso aleatorio hasta 3 segundos
      opacity: 0.6 + Math.random() * 0.4,
      duration: `${4 + Math.random() * 3}s`, // Duración de caída aleatoria (4 a 7 seg)
      scale: 0.5 + Math.random() * 1
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
                animationDuration: item.duration,
                opacity: item.opacity,
                transform: `scale(${item.scale})`
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
