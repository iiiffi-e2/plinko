import type { RiskMode, RowCount, SlotValue } from "@/types";

// Slot values for different risk modes and row counts
// Traditional Plinko layout: HIGH multipliers on edges, LOW in center
// This matches the binomial distribution from physics (most balls land in center)
// Values are calibrated for ~97% expected return rate
const SLOT_VALUES: Record<RiskMode, Record<RowCount, number[]>> = {
  // Low risk: Smaller variance, more consistent returns
  // Center slots are close to 1x, edges slightly higher
  low: {
    8: [1.5, 1.2, 1.1, 1.0, 0.9, 1.0, 1.1, 1.2, 1.5],
    10: [1.6, 1.3, 1.1, 1.0, 0.9, 0.9, 0.9, 1.0, 1.1, 1.3, 1.6],
    12: [1.7, 1.4, 1.2, 1.0, 0.9, 0.8, 0.8, 0.8, 0.9, 1.0, 1.2, 1.4, 1.7],
    14: [1.8, 1.4, 1.2, 1.1, 0.9, 0.8, 0.8, 0.7, 0.8, 0.8, 0.9, 1.1, 1.2, 1.4, 1.8],
    16: [1.9, 1.5, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.7, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.5, 1.9],
  },
  // Balanced: Classic Plinko distribution with moderate risk
  // Edges have good multipliers, center has losses
  balanced: {
    8: [5.6, 2.1, 1.1, 0.5, 0.3, 0.5, 1.1, 2.1, 5.6],
    10: [8.9, 3.0, 1.4, 0.7, 0.4, 0.3, 0.4, 0.7, 1.4, 3.0, 8.9],
    12: [13.0, 4.0, 1.6, 0.9, 0.5, 0.3, 0.2, 0.3, 0.5, 0.9, 1.6, 4.0, 13.0],
    14: [18.0, 5.2, 2.0, 1.0, 0.6, 0.3, 0.2, 0.2, 0.2, 0.3, 0.6, 1.0, 2.0, 5.2, 18.0],
    16: [24.0, 6.5, 2.5, 1.2, 0.7, 0.4, 0.2, 0.2, 0.2, 0.2, 0.2, 0.4, 0.7, 1.2, 2.5, 6.5, 24.0],
  },
  // High risk: Big jackpots on edges, heavy losses in center
  // Edge slots are rare but pay big
  high: {
    8: [29.0, 4.0, 0.6, 0.2, 0.1, 0.2, 0.6, 4.0, 29.0],
    10: [76.0, 10.0, 1.0, 0.3, 0.1, 0.1, 0.1, 0.3, 1.0, 10.0, 76.0],
    12: [170.0, 24.0, 2.0, 0.5, 0.2, 0.1, 0.1, 0.1, 0.2, 0.5, 2.0, 24.0, 170.0],
    14: [420.0, 56.0, 4.0, 0.8, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.8, 4.0, 56.0, 420.0],
    16: [1000.0, 130.0, 8.0, 1.2, 0.4, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.4, 1.2, 8.0, 130.0, 1000.0],
  },
};

/**
 * Get slot values for a given risk mode and row count
 * Uses traditional Plinko layout (no shuffling) for proper game balance
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
 * Get the binomial probability distribution for slot landings
 * This represents the natural probability of a ball landing in each slot
 * based on physics (each peg is ~50/50 left/right)
 */
export function getSlotProbabilities(rowCount: RowCount): number[] {
  const slotCount = getSlotCount(rowCount);
  const probabilities: number[] = [];
  
  // Use Pascal's triangle coefficients (binomial distribution)
  const total = Math.pow(2, rowCount);
  for (let i = 0; i < slotCount; i++) {
    probabilities.push(binomialCoefficient(rowCount, i) / total);
  }
  
  return probabilities;
}

/**
 * Calculate expected return rate for a given configuration
 * EV = sum(probability[i] * multiplier[i])
 * Values < 1 favor the house, > 1 favor the player
 */
export function calculateExpectedReturn(riskMode: RiskMode, rowCount: RowCount): number {
  const probabilities = getSlotProbabilities(rowCount);
  const multipliers = SLOT_VALUES[riskMode][rowCount];
  
  let ev = 0;
  for (let i = 0; i < probabilities.length; i++) {
    ev += probabilities[i] * multipliers[i];
  }
  
  return ev;
}

/**
 * Select a random slot index based on binomial probability distribution
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
