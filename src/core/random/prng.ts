/** Générateur pseudo-aléatoire reproductible (mulberry32). */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** Flottant dans [0, 1[. */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Entier dans [min, max]. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Entier non nul dans [min, max]. */
  nonZero(min: number, max: number): number {
    let v = 0;
    while (v === 0) v = this.int(min, max);
    return v;
  }

  /** Entier dans [min, max] hors des valeurs exclues. */
  intExcept(min: number, max: number, excluded: number[]): number {
    let v: number;
    do v = this.int(min, max);
    while (excluded.includes(v));
    return v;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  sign(): 1 | -1 {
    return this.next() < 0.5 ? 1 : -1;
  }

  bool(p = 0.5): boolean {
    return this.next() < p;
  }

  shuffle<T>(items: T[]): T[] {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

/** Graine aléatoire 32 bits (non reproductible). */
export function randomSeed(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * 2 ** 32);
}
