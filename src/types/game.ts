export interface Pokemon {
  id: number;
  name: string;
  image: string;
  types: string[];
}

export interface GameState {
  board1: BoardItem[];
  board2: BoardItem[];
  secretPokemon1: Pokemon | null;
  secretPokemon2: Pokemon | null;
  turn: 1 | 2;
  phase: 'lobby' | 'setup' | 'playing' | 'gameover';
  winner: 1 | 2 | null;
}

export interface BoardItem {
  pokemon: Pokemon;
  isFlipped: boolean;
  isWrong?: boolean;
}
