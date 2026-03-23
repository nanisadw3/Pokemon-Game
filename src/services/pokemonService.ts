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
  const totalPokemons = 1025; // Incluye hasta la Gen 9
  const randomIds: number[] = [];
  
  while (randomIds.length < count) {
    const randomId = Math.floor(Math.random() * totalPokemons) + 1;
    if (!randomIds.includes(randomId) && !excludeIds.includes(randomId)) {
      randomIds.push(randomId);
    }
    // Evitar bucle infinito si ya tenemos casi todos
    if (excludeIds.length + randomIds.length >= totalPokemons) break;
  }

  const pokemonPromises = randomIds.map(id => fetch(`${BASE_URL}/${id}`).then(res => res.json()));
  const pokemonsData = await Promise.all(pokemonPromises);

  return (pokemonsData as PokeAPIRes[]).map((data) => ({
    id: data.id,
    name: data.name,
    image: data.sprites.other['official-artwork'].front_default,
    types: data.types.map((t) => t.type.name),
  }));
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
