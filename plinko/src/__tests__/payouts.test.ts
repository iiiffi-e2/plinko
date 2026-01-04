import { describe, it, expect } from "vitest";
import {
  getSlotValues,
  calculatePayout,
  getSlotCount,
  getSlotProbabilities,
  selectTargetSlot,
  formatMultiplier,
  getSlotColor,
  getSlotIntensity,
} from "../utils/payouts";

describe("Payout Calculations", () => {
  describe("getSlotValues", () => {
    it("should return correct number of slots for each row count", () => {
      expect(getSlotValues("balanced", 8)).toHaveLength(9);
      expect(getSlotValues("balanced", 10)).toHaveLength(11);
      expect(getSlotValues("balanced", 12)).toHaveLength(13);
      expect(getSlotValues("balanced", 14)).toHaveLength(15);
      expect(getSlotValues("balanced", 16)).toHaveLength(17);
    });

    it("should have symmetric multipliers for balanced mode", () => {
      const slots = getSlotValues("balanced", 12);
      const multipliers = slots.map((s) => s.multiplier);
      
      // Check symmetry
      for (let i = 0; i < multipliers.length / 2; i++) {
        expect(multipliers[i]).toBe(multipliers[multipliers.length - 1 - i]);
      }
    });

    it("should have highest value in center for balanced mode", () => {
      const slots = getSlotValues("balanced", 12);
      const multipliers = slots.map((s) => s.multiplier);
      const centerIndex = Math.floor(multipliers.length / 2);
      const maxValue = Math.max(...multipliers);
      
      expect(multipliers[centerIndex]).toBe(maxValue);
    });

    it("should have higher extreme values in high risk mode", () => {
      const lowRisk = getSlotValues("low", 12);
      const highRisk = getSlotValues("high", 12);
      
      const lowMax = Math.max(...lowRisk.map((s) => s.multiplier));
      const highMax = Math.max(...highRisk.map((s) => s.multiplier));
      
      expect(highMax).toBeGreaterThan(lowMax);
    });
  });

  describe("calculatePayout", () => {
    it("should calculate correct payout", () => {
      // For balanced 12 rows, center slot has 5x multiplier
      const payout = calculatePayout(100, 6, "balanced", 12);
      expect(payout).toBe(500); // 100 * 5x
    });

    it("should return 0 for invalid slot index", () => {
      expect(calculatePayout(100, -1, "balanced", 12)).toBe(0);
      expect(calculatePayout(100, 100, "balanced", 12)).toBe(0);
    });

    it("should handle edge slots correctly", () => {
      const payoutLeft = calculatePayout(100, 0, "balanced", 12);
      const payoutRight = calculatePayout(100, 12, "balanced", 12);
      
      // Edge slots should have same payout (symmetric)
      expect(payoutLeft).toBe(payoutRight);
    });
  });

  describe("getSlotCount", () => {
    it("should return rowCount + 1", () => {
      expect(getSlotCount(8)).toBe(9);
      expect(getSlotCount(10)).toBe(11);
      expect(getSlotCount(12)).toBe(13);
      expect(getSlotCount(14)).toBe(15);
      expect(getSlotCount(16)).toBe(17);
    });
  });

  describe("getSlotProbabilities", () => {
    it("should return probabilities that sum to 1", () => {
      const probs = getSlotProbabilities(12);
      const sum = probs.reduce((a, b) => a + b, 0);
      
      expect(sum).toBeCloseTo(1, 10);
    });

    it("should return correct number of probabilities", () => {
      expect(getSlotProbabilities(8)).toHaveLength(9);
      expect(getSlotProbabilities(12)).toHaveLength(13);
      expect(getSlotProbabilities(16)).toHaveLength(17);
    });

    it("should have symmetric distribution", () => {
      const probs = getSlotProbabilities(12);
      
      for (let i = 0; i < probs.length / 2; i++) {
        expect(probs[i]).toBeCloseTo(probs[probs.length - 1 - i], 10);
      }
    });

    it("should have highest probability in center (binomial distribution)", () => {
      const probs = getSlotProbabilities(12);
      const centerIndex = Math.floor(probs.length / 2);
      const maxProb = Math.max(...probs);
      
      expect(probs[centerIndex]).toBe(maxProb);
    });
  });

  describe("selectTargetSlot", () => {
    it("should return a valid slot index", () => {
      for (let i = 0; i < 100; i++) {
        const slot = selectTargetSlot(12);
        expect(slot).toBeGreaterThanOrEqual(0);
        expect(slot).toBeLessThan(13);
      }
    });

    it("should return deterministic results with same seed", () => {
      const seed = 12345;
      const results: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        results.push(selectTargetSlot(12, seed));
      }
      
      // All results should be the same with same seed
      expect(new Set(results).size).toBe(1);
    });

    it("should return different results with different seeds", () => {
      const results = new Set<number>();
      
      for (let seed = 0; seed < 1000; seed++) {
        results.add(selectTargetSlot(12, seed));
      }
      
      // Should have multiple different results
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe("formatMultiplier", () => {
    it("should format multipliers correctly", () => {
      expect(formatMultiplier(0.5)).toBe("0.5x");
      expect(formatMultiplier(1)).toBe("1.0x");
      expect(formatMultiplier(5)).toBe("5.0x");
      expect(formatMultiplier(10)).toBe("10x");
      expect(formatMultiplier(100)).toBe("100x");
    });
  });

  describe("getSlotColor", () => {
    it("should return different colors for different multipliers", () => {
      const low = getSlotColor(0.5);
      const medium = getSlotColor(2);
      const high = getSlotColor(10);
      const huge = getSlotColor(100);
      
      // Each should have different background gradients
      expect(low.bg).not.toBe(medium.bg);
      expect(medium.bg).not.toBe(high.bg);
      expect(high.bg).not.toBe(huge.bg);
    });

    it("should return required color properties", () => {
      const colors = getSlotColor(5);
      
      expect(colors).toHaveProperty("bg");
      expect(colors).toHaveProperty("text");
      expect(colors).toHaveProperty("glow");
    });
  });

  describe("getSlotIntensity", () => {
    it("should return value between 0 and 1", () => {
      expect(getSlotIntensity(1, 100)).toBeGreaterThanOrEqual(0);
      expect(getSlotIntensity(1, 100)).toBeLessThanOrEqual(1);
      expect(getSlotIntensity(100, 100)).toBeLessThanOrEqual(1);
    });

    it("should increase with multiplier", () => {
      const low = getSlotIntensity(1, 100);
      const high = getSlotIntensity(50, 100);
      
      expect(high).toBeGreaterThan(low);
    });
  });
});

describe("Distribution Weighting", () => {
  it("should favor center slots statistically", () => {
    const slotCounts: Record<number, number> = {};
    const iterations = 10000;
    
    for (let i = 0; i < iterations; i++) {
      const slot = selectTargetSlot(12, Math.random() * 1000000);
      slotCounts[slot] = (slotCounts[slot] || 0) + 1;
    }
    
    // Center slot (index 6) should have highest count
    const centerCount = slotCounts[6] || 0;
    const edgeCount = (slotCounts[0] || 0) + (slotCounts[12] || 0);
    
    expect(centerCount).toBeGreaterThan(edgeCount);
  });

  it("should have roughly equal edge probabilities", () => {
    const slotCounts: Record<number, number> = {};
    const iterations = 50000;
    
    for (let i = 0; i < iterations; i++) {
      const slot = selectTargetSlot(12, Math.random() * 1000000);
      slotCounts[slot] = (slotCounts[slot] || 0) + 1;
    }
    
    // Left and right edges should be roughly equal
    const leftEdge = slotCounts[0] || 0;
    const rightEdge = slotCounts[12] || 0;
    
    // Both edges should have similar (small) counts relative to total
    // With 50000 iterations and 13 slots, edges should each get roughly 0.02% = ~12 hits
    // Allow for statistical variance - both should be non-zero and within 5x of each other
    expect(leftEdge).toBeGreaterThan(0);
    expect(rightEdge).toBeGreaterThan(0);
    
    const ratio = Math.max(leftEdge, rightEdge) / Math.min(leftEdge, rightEdge);
    expect(ratio).toBeLessThan(5); // Very generous tolerance for random variance
  });
});
