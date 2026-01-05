"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGameStore,
  useBetAmount,
  useRiskMode,
  useRowCount,
  useBalance,
  useBatchDrop,
  useSettings,
} from "@/store/gameStore";
import { audioManager } from "@/lib/audioManager";
import type { RiskMode, RowCount } from "@/types";

const RISK_MODES: { value: RiskMode; label: string; description: string }[] = [
  { value: "low", label: "Low", description: "Safe & steady" },
  { value: "balanced", label: "Balanced", description: "Best of both" },
  { value: "high", label: "High", description: "High risk, high reward" },
];

const ROW_OPTIONS: RowCount[] = [8, 10, 12, 14, 16];

const BATCH_OPTIONS = [1, 5, 10, 25, 50];

export function ControlPanel() {
  const [selectedBatchSize, setSelectedBatchSize] = useState(1);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const betAmount = useBetAmount();
  const riskMode = useRiskMode();
  const rowCount = useRowCount();
  const balance = useBalance();
  const batchDrop = useBatchDrop();
  const settings = useSettings();
  
  const setBetAmount = useGameStore((state) => state.setBetAmount);
  const setRiskMode = useGameStore((state) => state.setRiskMode);
  const setRowCount = useGameStore((state) => state.setRowCount);
  const placeBet = useGameStore((state) => state.placeBet);
  const incrementActiveChips = useGameStore((state) => state.incrementActiveChips);
  const startBatchDrop = useGameStore((state) => state.startBatchDrop);
  const startNewSession = useGameStore((state) => state.startNewSession);
  const updateBatchProgress = useGameStore((state) => state.updateBatchProgress);
  const endBatchDrop = useGameStore((state) => state.endBatchDrop);
  
  const canAffordBet = balance >= betAmount;
  const canAffordBatch = balance >= betAmount * selectedBatchSize;
  
  const dropChip = useCallback(() => {
    if (!canAffordBet) return;
    
    // Start a new session for this single drop (1 chip)
    startNewSession(1);
    
    if (placeBet()) {
      incrementActiveChips();
      audioManager.play("click");
      
      // Call the global drop function
      const dropFn = (window as unknown as { dropPlinkoChip?: (x?: number) => void }).dropPlinkoChip;
      if (dropFn) {
        // Random position near center
        const x = 0.4 + Math.random() * 0.2;
        dropFn(x);
      }
    }
  }, [canAffordBet, placeBet, incrementActiveChips, startNewSession]);
  
  const startBatch = useCallback(() => {
    if (!canAffordBatch || batchDrop.isRunning) return;
    
    startBatchDrop(selectedBatchSize);
    audioManager.play("click");
    
    let droppedCount = 0;
    
    const dropNext = () => {
      if (droppedCount >= selectedBatchSize) {
        endBatchDrop();
        return;
      }
      
      if (placeBet()) {
        incrementActiveChips();
        updateBatchProgress();
        
        const dropFn = (window as unknown as { dropPlinkoChip?: (x?: number) => void }).dropPlinkoChip;
        if (dropFn) {
          const x = 0.3 + Math.random() * 0.4;
          dropFn(x);
        }
        
        droppedCount++;
        
        // Schedule next drop with random delay
        const delay = 350 + Math.random() * 250;
        batchTimeoutRef.current = setTimeout(dropNext, delay);
      } else {
        // Can't afford more drops
        endBatchDrop();
      }
    };
    
    dropNext();
  }, [
    canAffordBatch,
    batchDrop.isRunning,
    selectedBatchSize,
    startBatchDrop,
    placeBet,
    incrementActiveChips,
    updateBatchProgress,
    endBatchDrop,
  ]);
  
  const cancelBatch = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    endBatchDrop();
  }, [endBatchDrop]);
  
  const adjustBet = (multiplier: number) => {
    audioManager.play("click");
    setBetAmount(Math.max(1, Math.round(betAmount * multiplier)));
  };
  
  return (
    <motion.div
      className="
        bg-white dark:bg-surface-900
        rounded-2xl border border-surface-200 dark:border-surface-800
        shadow-soft p-4 sm:p-6
        space-y-5
      "
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      {/* Bet Amount */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
          Bet Amount
        </label>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => adjustBet(0.5)}
            className="
              px-3 py-2 rounded-lg
              bg-surface-100 dark:bg-surface-800
              text-surface-600 dark:text-surface-400
              hover:bg-surface-200 dark:hover:bg-surface-700
              transition-colors text-sm font-medium
            "
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            ½
          </motion.button>
          
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
              $
            </span>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Math.max(1, parseInt(e.target.value) || 1))}
              className="
                w-full pl-7 pr-4 py-2.5 rounded-lg
                bg-surface-100 dark:bg-surface-800
                border border-surface-200 dark:border-surface-700
                text-surface-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-primary-500
                tabular-nums text-center font-medium
              "
              min={1}
              aria-label="Bet amount"
            />
          </div>
          
          <motion.button
            onClick={() => adjustBet(2)}
            className="
              px-3 py-2 rounded-lg
              bg-surface-100 dark:bg-surface-800
              text-surface-600 dark:text-surface-400
              hover:bg-surface-200 dark:hover:bg-surface-700
              transition-colors text-sm font-medium
            "
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            2×
          </motion.button>
        </div>
        
        {/* Quick bet buttons */}
        <div className="flex gap-1.5">
          {[10, 50, 100, 500, 1000].map((amount) => (
            <motion.button
              key={amount}
              onClick={() => {
                audioManager.play("click");
                setBetAmount(amount);
              }}
              className={`
                flex-1 py-1.5 rounded-md text-xs font-medium transition-colors
                ${betAmount === amount
                  ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                  : "bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {amount >= 1000 ? `${amount / 1000}k` : amount}
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Risk Mode */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
          Risk Level
        </label>
        <div className="grid grid-cols-3 gap-2">
          {RISK_MODES.map((mode) => (
            <motion.button
              key={mode.value}
              onClick={() => {
                audioManager.play("click");
                setRiskMode(mode.value);
              }}
              className={`
                py-2.5 px-3 rounded-xl text-center transition-all
                ${riskMode === mode.value
                  ? "bg-primary-500 text-white shadow-glow"
                  : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="font-semibold text-sm">{mode.label}</span>
              <span className={`
                block text-xs mt-0.5
                ${riskMode === mode.value ? "text-primary-100" : "text-surface-400"}
              `}>
                {mode.description}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Row Count */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
          Rows: {rowCount}
        </label>
        <div className="flex gap-1.5">
          {ROW_OPTIONS.map((rows) => (
            <motion.button
              key={rows}
              onClick={() => {
                audioManager.play("click");
                setRowCount(rows);
              }}
              className={`
                flex-1 py-2 rounded-lg text-sm font-medium transition-all
                ${rowCount === rows
                  ? "bg-primary-500 text-white shadow-glow"
                  : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {rows}
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Batch Size */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
          Chips per Drop
        </label>
        <div className="flex gap-1.5">
          {BATCH_OPTIONS.map((count) => (
            <motion.button
              key={count}
              onClick={() => {
                audioManager.play("click");
                setSelectedBatchSize(count);
              }}
              className={`
                flex-1 py-2 rounded-lg text-sm font-medium transition-all
                ${selectedBatchSize === count
                  ? "bg-primary-500 text-white shadow-glow"
                  : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {count}
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Drop Button */}
      <div className="pt-2">
        <AnimatePresence mode="wait">
          {batchDrop.isRunning ? (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-surface-600 dark:text-surface-400">
                    Dropping...
                  </span>
                  <span className="font-medium text-surface-900 dark:text-white">
                    {batchDrop.completedDrops} / {batchDrop.totalDrops}
                  </span>
                </div>
                <div className="h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary-400 to-primary-600"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(batchDrop.completedDrops / batchDrop.totalDrops) * 100}%`,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
              
              {/* Cancel button */}
              <motion.button
                onClick={cancelBatch}
                className="
                  w-full py-3 px-4 rounded-xl
                  bg-red-500 hover:bg-red-600
                  text-white font-semibold
                  transition-colors
                "
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                Cancel
              </motion.button>
            </motion.div>
          ) : (
            <motion.button
              key="drop"
              onClick={selectedBatchSize === 1 ? dropChip : startBatch}
              disabled={selectedBatchSize === 1 ? !canAffordBet : !canAffordBatch}
              className={`
                w-full py-4 px-6 rounded-xl
                font-bold text-lg
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                dark:focus:ring-offset-surface-900
                ${(selectedBatchSize === 1 ? canAffordBet : canAffordBatch)
                  ? "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-glow"
                  : "bg-surface-200 dark:bg-surface-800 text-surface-400 cursor-not-allowed"
                }
              `}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              whileHover={(selectedBatchSize === 1 ? canAffordBet : canAffordBatch) ? { scale: 1.02, y: -2 } : {}}
              whileTap={(selectedBatchSize === 1 ? canAffordBet : canAffordBatch) ? { scale: 0.98 } : {}}
            >
              {selectedBatchSize === 1 ? "DROP" : `DROP ${selectedBatchSize}`}
              <span className="block text-sm font-normal mt-0.5 opacity-80">
                {selectedBatchSize === 1
                  ? `$${betAmount.toLocaleString()}`
                  : `$${(betAmount * selectedBatchSize).toLocaleString()} total`
                }
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      
      {/* Deterministic mode indicator */}
      {settings.deterministicMode && (
        <motion.div
          className="
            flex items-center gap-2 p-3 rounded-lg
            bg-amber-50 dark:bg-amber-900/20
            border border-amber-200 dark:border-amber-800
          "
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-amber-700 dark:text-amber-400">
            Deterministic mode active (demo)
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
