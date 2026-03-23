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

  const winnerDiamonds = useMemo(() => {
    return [...Array(120)].map((_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 600;
      return {
        id: i,
        tx: `${Math.cos(angle) * dist}px`,
        ty: `${Math.sin(angle) * dist}px`,
        delay: `${Math.random() * 0.5}s`,
        color: ['#fff', '#facc15', '#3b82f6'][i % 3]
      };
    });
  }, []);

  const loserNebula = useMemo(() => {
    return [...Array(15)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      tx: `${(Math.random() - 0.5) * 200}px`,
      ty: `${(Math.random() - 0.5) * 200}px`,
      delay: `${Math.random() * 2}s`
    }));
  }, []);

  return (
    <>
      <div className="victory-overlay">
        {isWinner ? (
          <div className="confetti-container">
            {winnerDiamonds.map((d) => (
              <div 
                key={d.id} 
                className="particle-diamond" 
                style={{ 
                  left: '50%', 
                  top: '50%',
                  backgroundColor: d.color,
                  '--tx': d.tx,
                  '--ty': d.ty,
                  animationDelay: d.delay 
                } as React.CSSProperties} 
              />
            ))}
          </div>
        ) : (
          <div className="confetti-container">
            {loserNebula.map((n) => (
              <div 
                key={n.id} 
                className="particle-nebula" 
                style={{ 
                  left: n.left, 
                  top: n.top,
                  '--tx': n.tx,
                  '--ty': n.ty,
                  animationDelay: n.delay 
                } as React.CSSProperties} 
              />
            ))}
          </div>
        )}

        <div className="victory-card-epic">
          <h1>{isWinner ? "🏆 VICTORIA 🏆" : "💫 REINTENTAR 💫"}</h1>
          <img 
            src={opponentSecret?.image} 
            className="winner-image" 
            alt="Pokemon" 
            style={{ width: '250px', height: '250px', filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.3))' }}
          />
          <p style={{ margin: '20px 0', fontSize: '1.2rem', opacity: 0.8 }}>El Pokémon era</p>
          <h2 style={{ fontSize: '2.5rem', color: '#facc15', textTransform: 'uppercase', marginBottom: '40px' }}>
            {opponentSecret?.name}
          </h2>
          <button 
            onClick={() => window.location.reload()} 
            className="play-again-btn"
            style={{ padding: '20px 50px', fontSize: '1.4rem' }}
          >
            NUEVA PARTIDA
          </button>
        </div>
      </div>
    </>
  );
};

export default GameOver;
