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
    const allRes = await fetch(`${BASE_URL}?limit=1300`); // Límite razonable para evitar formas raras sin arte
    const allData = await allRes.json();
    const allResults = allData.results;

    const validPokemons: Pokemon[] = [];
    const usedIndices = new Set<number>();

    while (validPokemons.length < count && usedIndices.size < allResults.length) {
      const randomIndex = Math.floor(Math.random() * allResults.length);
      if (usedIndices.has(randomIndex)) continue;
      
      usedIndices.add(randomIndex);
      const p = allResults[randomIndex];
      const id = parseInt(p.url.split('/').filter(Boolean).pop()!);
      
      if (excludeIds.includes(id)) continue;

      try {
        const detailsRes = await fetch(p.url);
        const data = await detailsRes.json();
        const image = data.sprites.other['official-artwork'].front_default || data.sprites.front_default;
        
        if (image) {
          validPokemons.push({
            id: data.id,
            name: data.name,
            image: image,
            types: data.types.map((t: any) => t.type.name),
          });
        }
      } catch (e) {
        console.error("Error fetching individual pokemon:", e);
      }
    }

    return validPokemons;
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

    const image = data.sprites.other['official-artwork'].front_default || data.sprites.front_default;
    if (!image) return null;

    return {
      id: data.id,
      name: data.name,
      image: image,
      types: data.types.map((t: any) => t.type.name),
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
    
    const image = data.sprites.other['official-artwork'].front_default || data.sprites.front_default;
    if (!image) return null;

    return {
      id: data.id,
      name: data.name,
      image: image,
      types: data.types.map((t: any) => t.type.name),
    };
  } catch {
    return null;
  }
}
