import type { RiskMode, RowCount, SlotValue } from "@/types";

// Slot values for different risk modes and row counts
// Values are multipliers (e.g., 0.2x, 1x, 10x)
const SLOT_VALUES: Record<RiskMode, Record<RowCount, number[]>> = {
  low: {
    8: [1.1, 1.2, 1.4, 1.6, 2.1, 1.6, 1.4, 1.2, 1.1],
    10: [1.1, 1.1, 1.2, 1.3, 1.5, 1.8, 1.5, 1.3, 1.2, 1.1, 1.1],
    12: [1.1, 1.1, 1.1, 1.2, 1.3, 1.5, 2.0, 1.5, 1.3, 1.2, 1.1, 1.1, 1.1],
    14: [1.0, 1.1, 1.1, 1.1, 1.2, 1.3, 1.5, 2.0, 1.5, 1.3, 1.2, 1.1, 1.1, 1.1, 1.0],
    16: [1.0, 1.0, 1.1, 1.1, 1.1, 1.2, 1.3, 1.5, 2.0, 1.5, 1.3, 1.2, 1.1, 1.1, 1.1, 1.0, 1.0],
  },
  balanced: {
    8: [0.5, 1.0, 1.5, 2.5, 5.0, 2.5, 1.5, 1.0, 0.5],
    10: [0.4, 0.7, 1.0, 1.5, 2.5, 5.0, 2.5, 1.5, 1.0, 0.7, 0.4],
    12: [0.3, 0.5, 0.8, 1.0, 1.5, 2.5, 5.0, 2.5, 1.5, 1.0, 0.8, 0.5, 0.3],
    14: [0.2, 0.4, 0.6, 0.8, 1.0, 1.5, 2.5, 5.0, 2.5, 1.5, 1.0, 0.8, 0.6, 0.4, 0.2],
    16: [0.2, 0.3, 0.4, 0.6, 0.8, 1.0, 1.5, 2.5, 5.0, 2.5, 1.5, 1.0, 0.8, 0.6, 0.4, 0.3, 0.2],
  },
  high: {
    8: [0.2, 0.3, 0.5, 2.0, 15.0, 2.0, 0.5, 0.3, 0.2],
    10: [0.1, 0.2, 0.3, 0.5, 2.0, 25.0, 2.0, 0.5, 0.3, 0.2, 0.1],
    12: [0.1, 0.1, 0.2, 0.3, 0.5, 2.0, 50.0, 2.0, 0.5, 0.3, 0.2, 0.1, 0.1],
    14: [0.1, 0.1, 0.1, 0.2, 0.3, 0.5, 2.0, 100.0, 2.0, 0.5, 0.3, 0.2, 0.1, 0.1, 0.1],
    16: [0.1, 0.1, 0.1, 0.1, 0.2, 0.3, 0.5, 2.0, 200.0, 2.0, 0.5, 0.3, 0.2, 0.1, 0.1, 0.1, 0.1],
  },
};

/**
 * Get slot values for a given risk mode and row count
 */
export function getSlotValues(riskMode: RiskMode, rowCount: RowCount): SlotValue[] {
  const multipliers = SLOT_VALUES[riskMode][rowCount];
  return multipliers.map((multiplier) => ({
    multiplier,
    label: formatMultiplier(multiplier),
  }));
}

/**
 * Format a multiplier for display
 */
export function formatMultiplier(multiplier: number): string {
  if (multiplier >= 100) {
    return `${multiplier.toFixed(0)}x`;
  }
  if (multiplier >= 10) {
    return `${multiplier.toFixed(0)}x`;
  }
  if (multiplier >= 1) {
    return `${multiplier.toFixed(1)}x`;
  }
  return `${multiplier.toFixed(1)}x`;
}

/**
 * Calculate payout for a given bet amount and slot index
 */
export function calculatePayout(
  betAmount: number,
  slotIndex: number,
  riskMode: RiskMode,
  rowCount: RowCount
): number {
  const slots = getSlotValues(riskMode, rowCount);
  if (slotIndex < 0 || slotIndex >= slots.length) {
    return 0;
  }
  return betAmount * slots[slotIndex].multiplier;
}

/**
 * Get slot count for a given row count
 * Number of slots = rowCount + 1
 */
export function getSlotCount(rowCount: RowCount): number {
  return rowCount + 1;
}

/**
 * Get the probability distribution for deterministic mode
 * This uses a binomial distribution approximation
 */
export function getSlotProbabilities(rowCount: RowCount): number[] {
  const slotCount = getSlotCount(rowCount);
  const probabilities: number[] = [];
  
  // Use Pascal's triangle coefficients (binomial distribution)
  for (let i = 0; i < slotCount; i++) {
    probabilities.push(binomialCoefficient(rowCount, i));
  }
  
  // Normalize
  const total = probabilities.reduce((a, b) => a + b, 0);
  return probabilities.map((p) => p / total);
}

/**
 * Calculate binomial coefficient (n choose k)
 */
function binomialCoefficient(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return result;
}

/**
 * Select a random slot index based on probability distribution
 * Used for deterministic mode
 */
export function selectTargetSlot(rowCount: RowCount, seed?: number): number {
  const probabilities = getSlotProbabilities(rowCount);
  const random = seed !== undefined ? seededRandom(seed) : Math.random();
  
  let cumulative = 0;
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i];
    if (random < cumulative) {
      return i;
    }
  }
  
  return probabilities.length - 1;
}

/**
 * Simple seeded random number generator
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Get the color for a slot based on its multiplier value
 * Returns a CSS color string
 */
export function getSlotColor(multiplier: number): { bg: string; text: string; glow: string } {
  if (multiplier >= 50) {
    return {
      bg: "from-yellow-500 to-orange-500",
      text: "text-yellow-100",
      glow: "shadow-yellow-500/50",
    };
  }
  if (multiplier >= 10) {
    return {
      bg: "from-purple-500 to-pink-500",
      text: "text-purple-100",
      glow: "shadow-purple-500/50",
    };
  }
  if (multiplier >= 5) {
    return {
      bg: "from-blue-500 to-cyan-500",
      text: "text-blue-100",
      glow: "shadow-blue-500/50",
    };
  }
  if (multiplier >= 2) {
    return {
      bg: "from-green-500 to-emerald-500",
      text: "text-green-100",
      glow: "shadow-green-500/50",
    };
  }
  if (multiplier >= 1) {
    return {
      bg: "from-slate-400 to-slate-500",
      text: "text-slate-100",
      glow: "shadow-slate-500/30",
    };
  }
  return {
    bg: "from-slate-500 to-slate-600",
    text: "text-slate-200",
    glow: "shadow-slate-600/20",
  };
}

/**
 * Get intensity level for slot coloring (0-1)
 */
export function getSlotIntensity(multiplier: number, maxMultiplier: number): number {
  return Math.min(1, Math.log(multiplier + 1) / Math.log(maxMultiplier + 1));
}
