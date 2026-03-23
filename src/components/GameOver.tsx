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
    return [...Array(150)].map((_, i) => {
      // Ángulo aleatorio y distancia para la explosión desde el centro
      const angle = Math.random() * Math.PI * 2;
      const dist = 100 + Math.random() * 800;
      const tx = `${Math.cos(angle) * dist}px`;
      const ty = `${Math.sin(angle) * dist}px`;
      const tr = `${Math.random() * 1000}deg`;

      return {
        id: i,
        tx, ty, tr,
        delay: `${Math.random() * 0.5}s`,
        opacity: 0.8 + Math.random() * 0.2,
        scale: 0.5 + Math.random() * 1.5,
      };
    });
  }, []);

  const rainDrops = useMemo(() => {
    return [...Array(80)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${0.5 + Math.random() * 0.5}s`
    }));
  }, []);

  return (
    <>
      {isWinner ? (
        <div className="confetti-container">
          {confettiItems.map((item) => (
            <div 
              key={item.id} 
              className={`confetti burst c${item.id % 6}`} 
              style={{ 
                '--tx': item.tx,
                '--ty': item.ty,
                '--tr': item.tr,
                animationDelay: item.delay,
                opacity: item.opacity,
                transform: `scale(${item.scale})`
              } as React.CSSProperties} 
            />
          ))}
        </div>
      ) : (
        <div className="defeat-overlay">
          {rainDrops.map((drop) => (
            <div 
              key={drop.id} 
              className="rain-drop" 
              style={{ 
                left: drop.left, 
                animationDelay: drop.delay, 
                animationDuration: drop.duration 
              }} 
            />
          ))}
        </div>
      )}

      <div className="victory-overlay">
        <div className={`victory-card-epic ${!isWinner ? 'defeat-card' : ''}`}>
          <h1>{isWinner ? "🏆 ¡GANASTE! 🏆" : "🌧️ PERDISTE..."}</h1>
          <img 
            src={opponentSecret?.image} 
            className={`winner-image ${!isWinner ? 'loser-image' : ''}`} 
            alt="Winner" 
          />
          <p>Era <span>{opponentSecret?.name}</span></p>
          <button 
            onClick={() => window.location.reload()} 
            className={`play-again-btn ${!isWinner ? 'retry-btn' : ''}`}
          >
            {isWinner ? '¡NUEVA PARTIDA!' : 'INTENTAR DE NUEVO'}
          </button>
        </div>
      </div>
    </>
  );
};

export default GameOver;
