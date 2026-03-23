import React from 'react';
import styles from './GameBoard.module.css';
import PokemonCard from './PokemonCard';
import type { BoardItem } from '../types/game';

interface GameBoardProps {
  board: BoardItem[];
  onCardClick: (index: number) => void;
  title: string;
  showNames: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({ board, onCardClick, title, showNames }) => {
  return (
    <div className={styles.boardContainer}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.grid}>
        {board.map((item, index) => (
          <PokemonCard
            key={`${item.pokemon.id}-${index}`}
            pokemon={item.pokemon}
            isFlipped={item.isFlipped}
            isWrong={item.isWrong}
            onClick={() => onCardClick(index)}
            showName={showNames}
            animationDelay={`${index * 0.02}s`}
          />
        ))}
      </div>
    </div>
  );
};

export default GameBoard;
