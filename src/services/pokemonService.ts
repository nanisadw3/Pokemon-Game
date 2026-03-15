import type { Pokemon } from '../types/game';

const BASE_URL = 'https://pokeapi.co/api/v2/pokemon';

export async function getRandomPokemons(count: number = 25): Promise<Pokemon[]> {
  const totalPokemons = 1025; // Incluye hasta la Gen 9
  const randomIds: number[] = [];
  
  while (randomIds.length < count) {
    const randomId = Math.floor(Math.random() * totalPokemons) + 1;
    if (!randomIds.includes(randomId)) {
      randomIds.push(randomId);
    }
  }

  const pokemonPromises = randomIds.map(id => fetch(`${BASE_URL}/${id}`).then(res => res.json()));
  const pokemonsData = await Promise.all(pokemonPromises);

  return pokemonsData.map(data => ({
    id: data.id,
    name: data.name,
    image: data.sprites.other['official-artwork'].front_default,
    types: data.types.map((t: any) => t.type.name),
  }));
}
