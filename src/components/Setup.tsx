import React from 'react';
import PokemonCard from './PokemonCard';
import type { Pokemon, BoardItem } from '../types/game';

interface SetupProps {
  myPlayerNum: 1 | 2 | null;
  board: BoardItem[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isSearchingGlobal: boolean;
  globalResults: Pokemon[];
  loadingMore: boolean;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  handleSelectSecret: (pokemon: Pokemon) => void;
  secretPokemon: Pokemon | null;
}

const Setup: React.FC<SetupProps> = ({
  myPlayerNum,
  board,
  searchTerm,
  setSearchTerm,
  isSearchingGlobal,
  globalResults,
  loadingMore,
  handleScroll,
  handleSelectSecret,
  secretPokemon
}) => {
  if (secretPokemon) {
    return (
      <div className="setup-waiting-fullscreen">
        <div className="pokeball-loading" style={{marginBottom: '40px'}}></div>
        <img 
          src={secretPokemon.image} 
          className="setup-waiting-pokemon"
          alt="Chosen Pokemon"
        />
        <p className="chosen-hint">HAS ELEGIDO A:</p>
        <h1 className="chosen-name">{secretPokemon.name}</h1>
        <h2 className="waiting-text-gradient">Esperando al Rival...</h2>
        <p style={{color: '#94a3b8', maxWidth: '400px'}}>El duelo comenzará en cuanto tu oponente elija su Pokémon secreto.</p>
      </div>
    );
  }

  return (
    <div className="setup-container">
      <div className="floating-search-bar">
        <div className="search-container">
          <input 
            type="text" 
            placeholder="Buscar pokemon" 
            className="search-input-floating" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
          {isSearchingGlobal && <div className="search-loader-main"></div>}
        </div>
      </div>
      
      <div className="setup-board-scroll" onScroll={handleScroll}>
        <div className="setup-header-inside">
          <h1>Preparación Jugador {myPlayerNum}</h1>
          <p>Desliza para ver más o busca tu favorito</p>
        </div>

        {searchTerm.trim().length > 0 ? (
          <div className="search-results-section">
            <h3>Resultados de búsqueda:</h3>
            <div className="selection-grid">
              {/* Primero resultados del tablero actual */}
              {board
                .filter(item => item.pokemon.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((item, idx) => (
                  <PokemonCard 
                    key={`local-${item.pokemon.id}`} 
                    pokemon={item.pokemon} 
                    isFlipped={false} 
                    onClick={() => handleSelectSecret(item.pokemon)} 
                    showName={true}
                    animationDelay={`${idx * 0.05}s`}
                  />
                ))}
              {/* Luego resultados globales (si no están ya en el tablero) */}
              {globalResults
                .filter(gp => !board.some(item => item.pokemon.id === gp.id))
                .map((gp, idx) => (
                  <PokemonCard 
                    key={`global-${gp.id}`} 
                    pokemon={gp} 
                    isFlipped={false} 
                    onClick={() => handleSelectSecret(gp)} 
                    showName={true}
                    animationDelay={`${(idx + board.filter(item => item.pokemon.name.toLowerCase().includes(searchTerm.toLowerCase())).length) * 0.05}s`}
                  />
                ))}
            </div>
            {board.filter(item => item.pokemon.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && globalResults.length === 0 && !isSearchingGlobal && (
              <div className="no-results">
                <p>No encontramos a "{searchTerm}". ¡Prueba con otro nombre!</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <h2>Elige TU Pokémon secreto del tablero</h2>
            <div className="selection-grid">
              {board.map((item, idx) => (
                <PokemonCard 
                  key={item.pokemon.id} 
                  pokemon={item.pokemon} 
                  isFlipped={false} 
                  onClick={() => handleSelectSecret(item.pokemon)} 
                  showName={true}
                  animationDelay={`${idx * 0.05}s`}
                />
              ))}
            </div>
          </>
        )}
        {loadingMore && (
          <div className="scroll-loader">
            <div className="pokeball-loading mini"></div>
            <p>Buscando más Pokémon...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Setup;
