// Deterministic seeded RNG so a given game seed always produces the same
// constituency map, but different seeds give genuinely different elections.
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rand = () => number;

export function randRange(rand: Rand, min: number, max: number) {
  return min + rand() * (max - min);
}

export function randInt(rand: Rand, min: number, max: number) {
  return Math.floor(randRange(rand, min, max + 1));
}

export function pick<T>(rand: Rand, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

// Standard-normal-ish noise via averaged uniforms (cheap Irwin-Hall approximation)
export function gaussNoise(rand: Rand, stdev = 1) {
  const u = rand() + rand() + rand() + rand() - 2;
  return u * stdev;
}
