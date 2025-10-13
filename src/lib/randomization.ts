/**
 * Randomization Utilities for Email Builder
 * Implements Fisher-Yates shuffle with optional seeding + phrase random selection
 */

/**
 * Seeded Random Number Generator (Linear Congruential Generator)
 * Produces deterministic pseudo-random numbers from a seed
 */
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Generate random integer in range [min, max] with optional seed
 */
export function seededRandomInt(min: number, max: number, seed?: number): number {
  const rng = seed !== undefined ? seededRandom(seed) : Math.random;
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Fisher-Yates Shuffle with optional seeding
 * Produces uniform random permutations of an array
 */
export function seededShuffle<T>(array: T[], seed?: number): T[] {
  const result = [...array];
  const rng = seed !== undefined ? seededRandom(seed) : Math.random;
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}

/**
 * Pin Rules Configuration
 * Defines modules that must stay at top or bottom during shuffle
 * Subject Line always first, Closing Line always last
 */
export const PINNED_TOP_KEYS = ['subject_line', 'initial_greeting'] as const;
export const PINNED_BOTTOM_KEYS = ['closing_line'] as const;

type PinnedTopKey = typeof PINNED_TOP_KEYS[number];

/**
 * Shuffle module order while respecting pin rules
 * Opening modules stay first, closing modules stay last, middle modules shuffle
 */
export function shuffleModuleOrder(
  allKeys: string[],
  seed?: number
): string[] {
  const pinnedTopSet = new Set<string>(PINNED_TOP_KEYS);
  const pinnedBottomSet = new Set<string>(PINNED_BOTTOM_KEYS);
  
  const top = allKeys.filter(k => pinnedTopSet.has(k));
  const bottom = allKeys.filter(k => pinnedBottomSet.has(k));
  const middle = allKeys.filter(k => !pinnedTopSet.has(k) && !pinnedBottomSet.has(k));
  
  const shuffledMiddle = seededShuffle(middle, seed);
  return [...top, ...shuffledMiddle, ...bottom];
}

/**
 * Pick random item from array with optional seeding
 * Returns null for empty arrays
 */
export function pickRandomPhrase<T extends { id: string }>(
  phrases: T[],
  seed?: number
): T | null {
  if (!phrases || phrases.length === 0) return null;
  const idx = seededRandomInt(0, phrases.length - 1, seed);
  return phrases[idx];
}

/**
 * Generate session seed for reproducible randomization
 * Combines contactId hash + timestamp for uniqueness
 */
export function generateSeed(contactId?: string): number {
  const base = contactId ? contactId.charCodeAt(0) * 1000 : 0;
  return base + (Date.now() % 100000);
}
