import type { Pokemon } from '../types/game';

const BASE_URL = 'https://pokeapi.co/api/v2/pokemon';

interface PokeAPIRes {
  id: number;
  name: string;
  sprites: {
    other: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
  types: {
    type: {
      name: string;
    };
  }[];
}

export async function getRandomPokemons(count: number = 25, excludeIds: number[] = []): Promise<Pokemon[]> {
  try {
    // Obtenemos la lista completa de todos los Pokémon (incluyendo Megas y formas especiales)
    const allRes = await fetch(`${BASE_URL}?limit=2000`);
    const allData = await allRes.json();
    const allResults = allData.results;

    const selectedResults: { name: string, url: string }[] = [];
    const usedIndices = new Set<number>();

    while (selectedResults.length < count && usedIndices.size < allResults.length) {
      const randomIndex = Math.floor(Math.random() * allResults.length);
      if (!usedIndices.has(randomIndex)) {
        usedIndices.add(randomIndex);
        const p = allResults[randomIndex];
        // Extraer ID de la URL para filtrar excluidos (ej: https://pokeapi.co/api/v2/pokemon/1/)
        const id = parseInt(p.url.split('/').filter(Boolean).pop()!);
        
        if (!excludeIds.includes(id)) {
          selectedResults.push(p);
        }
      }
    }

    const pokemonPromises = selectedResults.map(p => fetch(p.url).then(res => res.json()));
    const pokemonsData = await Promise.all(pokemonPromises);

    return (pokemonsData as PokeAPIRes[]).map((data) => ({
      id: data.id,
      name: data.name,
      image: data.sprites.other['official-artwork'].front_default || data.sprites.front_default || '',
      types: data.types.map((t) => t.type.name),
    }));
  } catch (error) {
    console.error("Error in getRandomPokemons:", error);
    return [];
  }
}

export async function getPokemonByName(name: string): Promise<Pokemon | null> {
  try {
    const res = await fetch(`${BASE_URL}/${name.toLowerCase().trim()}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      image: data.sprites.other['official-artwork'].front_default,
      types: data.types.map((t: { type: { name: string } }) => t.type.name),
    };
  } catch {
    return null;
  }
}

export async function getAllPokemonNames(): Promise<{ name: string, url: string }[]> {
  try {
    const res = await fetch(`${BASE_URL}?limit=10000`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results;
  } catch {
    return [];
  }
}

export async function getPokemonDetails(url: string): Promise<Pokemon | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id,
      name: data.name,
      image: data.sprites.other['official-artwork'].front_default,
      types: data.types.map((t: { type: { name: string } }) => t.type.name),
    };
  } catch {
    return null;
  }
}
