import React from 'react';
import styles from './PokemonCard.module.css';
import type { Pokemon } from '../types/game';

interface PokemonCardProps {
  pokemon: Pokemon;
  isFlipped: boolean;
  onClick: () => void;
  isSecret?: boolean;
  showName?: boolean;
  isWrong?: boolean;
}

const PokemonCard: React.FC<PokemonCardProps> = ({ 
  pokemon, 
  isFlipped, 
  onClick, 
  isSecret, 
  showName = true,
  isWrong = false 
}) => {
  return (
    <div 
      className={`
        ${styles.card} 
        ${isFlipped ? styles.flipped : ''} 
        ${isSecret ? styles.secret : ''} 
        ${isWrong ? styles.wrong : ''}
      `} 
      onClick={onClick}
    >
      <div className={styles.cardInner}>
        <div className={styles.cardFront}>
          <img src={pokemon.image} alt={pokemon.name} className={styles.pokemonImage} />
          {showName && <p className={styles.pokemonName}>{pokemon.name}</p>}
        </div>
        <div className={styles.cardBack}>
          <div className={styles.pokeball}>
            <div className={styles.pokeballButton}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PokemonCard;
