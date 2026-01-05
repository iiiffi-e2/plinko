"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  RiskMode,
  RowCount,
  DropResult,
  GameSettings,
  GameStats,
  BatchDropState,
  SimulationMode,
} from "@/types";
import { calculatePayout, getSlotCount } from "@/utils/payouts";

interface GameState {
  // Balance
  balance: number;
  
  // Game configuration
  betAmount: number;
  riskMode: RiskMode;
  rowCount: RowCount;
  
  // Settings
  settings: GameSettings;
  
  // Stats
  stats: GameStats;
  
  // History
  history: DropResult[];
  
  // Batch drop state
  batchDrop: BatchDropState;
  
  // Active chips count
  activeChips: number;
  
  // Last result (for animation)
  lastResult: DropResult | null;
  
  // Highlighted slot
  highlightedSlot: number | null;
  
  // Current session ID (groups drops from the same drop action)
  currentSessionId: string | null;
  // Number of chips expected in the current session
  sessionChipCount: number;
  
  // Actions
  setBalance: (balance: number) => void;
  setBetAmount: (amount: number) => void;
  setRiskMode: (mode: RiskMode) => void;
  setRowCount: (count: RowCount) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  
  // Game actions
  startNewSession: () => string;
  placeBet: () => boolean;
  recordResult: (slotIndex: number) => DropResult;
  incrementActiveChips: () => void;
  decrementActiveChips: () => void;
  setHighlightedSlot: (slot: number | null) => void;
  
  // Batch actions
  startBatchDrop: (count: number) => void;
  updateBatchProgress: () => void;
  endBatchDrop: () => void;
  addBatchResult: (result: DropResult) => void;
  
  // History actions
  clearHistory: () => void;
  
  // Stats actions
  resetStats: () => void;
  
  // Simulation mode
  getSimulationMode: () => SimulationMode;
}

const MAX_HISTORY_LENGTH = 50;
const MAX_ACTIVE_CHIPS = 200;
const INITIAL_BALANCE = 10000;

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Initial state
      balance: INITIAL_BALANCE,
      betAmount: 100,
      riskMode: "balanced",
      rowCount: 12,
      
      settings: {
        soundEnabled: false, // Off by default for user gesture compliance
        reducedMotion: false,
        deterministicMode: false,
        darkMode: false,
      },
      
      stats: {
        totalDrops: 0,
        totalWon: 0,
        totalBet: 0,
        bestPayout: 0,
        slotHistory: [],
      },
      
      history: [],
      
      batchDrop: {
        isRunning: false,
        totalDrops: 0,
        completedDrops: 0,
        results: [],
      },
      
      activeChips: 0,
      lastResult: null,
      highlightedSlot: null,
      currentSessionId: null,
      sessionChipCount: 0,
      
      // Actions
      setBalance: (balance) => set({ balance }),
      
      setBetAmount: (amount) => set({ betAmount: Math.max(1, amount) }),
      
      setRiskMode: (mode) => set({ riskMode: mode }),
      
      setRowCount: (count) => {
        set({ rowCount: count });
        // Reset slot history when row count changes
        const slotCount = getSlotCount(count);
        set((state) => ({
          stats: {
            ...state.stats,
            slotHistory: new Array(slotCount).fill(0),
          },
        }));
      },
      
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      
      startNewSession: (chipCount: number = 1) => {
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set({ 
          currentSessionId: sessionId,
          sessionChipCount: chipCount,
        });
        return sessionId;
      },
      
      placeBet: () => {
        const { balance, betAmount, activeChips } = get();
        
        if (balance < betAmount) {
          return false;
        }
        
        if (activeChips >= MAX_ACTIVE_CHIPS) {
          return false;
        }
        
        set({ balance: balance - betAmount });
        return true;
      },
      
      recordResult: (slotIndex) => {
        const { betAmount, riskMode, rowCount, history, stats, currentSessionId, sessionChipCount } = get();
        
        const payout = calculatePayout(betAmount, slotIndex, riskMode, rowCount);
        
        // Use current session ID or generate one if missing (for backward compatibility)
        const sessionId = currentSessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const result: DropResult = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          slotIndex,
          multiplier: payout / betAmount,
          betAmount,
          payout,
          riskMode,
          rowCount,
          sessionId,
        };
        
        // Update slot history
        const newSlotHistory = [...stats.slotHistory];
        if (newSlotHistory.length <= slotIndex) {
          while (newSlotHistory.length <= slotIndex) {
            newSlotHistory.push(0);
          }
        }
        newSlotHistory[slotIndex] = (newSlotHistory[slotIndex] || 0) + 1;
        
        const state = get();
        
        // Decrement session chip count
        const remainingChips = Math.max(0, sessionChipCount - 1);
        
        set({
          balance: state.balance + payout,
          lastResult: result,
          history: [result, ...history].slice(0, MAX_HISTORY_LENGTH),
          stats: {
            totalDrops: stats.totalDrops + 1,
            totalWon: stats.totalWon + payout,
            totalBet: stats.totalBet + betAmount,
            bestPayout: Math.max(stats.bestPayout, payout),
            slotHistory: newSlotHistory,
          },
          sessionChipCount: remainingChips,
        });
        
        // Clear session when all chips from this session have landed
        if (remainingChips === 0) {
          set({ currentSessionId: null });
        }
        
        return result;
      },
      
      incrementActiveChips: () =>
        set((state) => ({ activeChips: state.activeChips + 1 })),
      
      decrementActiveChips: () =>
        set((state) => ({ activeChips: Math.max(0, state.activeChips - 1) })),
      
      setHighlightedSlot: (slot) => set({ highlightedSlot: slot }),
      
      startBatchDrop: (count) => {
        const sessionId = get().startNewSession(count);
        set({
          batchDrop: {
            isRunning: true,
            totalDrops: count,
            completedDrops: 0,
            results: [],
          },
        });
      },
      
      updateBatchProgress: () =>
        set((state) => ({
          batchDrop: {
            ...state.batchDrop,
            completedDrops: state.batchDrop.completedDrops + 1,
          },
        })),
      
      endBatchDrop: () =>
        set((state) => ({
          batchDrop: {
            ...state.batchDrop,
            isRunning: false,
          },
          // Don't clear session here - let it clear when all chips land via recordResult
        })),
      
      addBatchResult: (result) =>
        set((state) => ({
          batchDrop: {
            ...state.batchDrop,
            results: [...state.batchDrop.results, result],
          },
        })),
      
      clearHistory: () => set({ history: [] }),
      
      resetStats: () => {
        const { rowCount } = get();
        const slotCount = getSlotCount(rowCount);
        set({
          stats: {
            totalDrops: 0,
            totalWon: 0,
            totalBet: 0,
            bestPayout: 0,
            slotHistory: new Array(slotCount).fill(0),
          },
        });
      },
      
      getSimulationMode: () => {
        const { settings } = get();
        return settings.deterministicMode ? "deterministic" : "physics";
      },
    }),
    {
      name: "plinko-game-storage",
      partialize: (state) => ({
        balance: state.balance,
        settings: state.settings,
        stats: state.stats,
        history: state.history,
        betAmount: state.betAmount,
        riskMode: state.riskMode,
        rowCount: state.rowCount,
      }),
    }
  )
);

// Selector hooks for optimized re-renders
export const useBalance = () => useGameStore((state) => state.balance);
export const useBetAmount = () => useGameStore((state) => state.betAmount);
export const useRiskMode = () => useGameStore((state) => state.riskMode);
export const useRowCount = () => useGameStore((state) => state.rowCount);
export const useSettings = () => useGameStore((state) => state.settings);
export const useStats = () => useGameStore((state) => state.stats);
export const useHistory = () => useGameStore((state) => state.history);
export const useBatchDrop = () => useGameStore((state) => state.batchDrop);
export const useLastResult = () => useGameStore((state) => state.lastResult);
export const useHighlightedSlot = () => useGameStore((state) => state.highlightedSlot);
