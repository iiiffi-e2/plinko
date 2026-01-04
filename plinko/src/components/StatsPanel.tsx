"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useStats, useRowCount, useGameStore } from "@/store/gameStore";
import { audioManager } from "@/lib/audioManager";
import { getSlotCount } from "@/utils/payouts";

export function StatsPanel() {
  const stats = useStats();
  const rowCount = useRowCount();
  const resetStats = useGameStore((state) => state.resetStats);
  
  const slotCount = getSlotCount(rowCount);
  
  const averagePayout = useMemo(() => {
    if (stats.totalDrops === 0) return 0;
    return stats.totalWon / stats.totalDrops;
  }, [stats.totalWon, stats.totalDrops]);
  
  const profitLoss = useMemo(() => {
    return stats.totalWon - stats.totalBet;
  }, [stats.totalWon, stats.totalBet]);
  
  const returnRate = useMemo(() => {
    if (stats.totalBet === 0) return 0;
    return (stats.totalWon / stats.totalBet) * 100;
  }, [stats.totalWon, stats.totalBet]);
  
  const maxSlotHits = useMemo(() => {
    return Math.max(...stats.slotHistory, 1);
  }, [stats.slotHistory]);
  
  const handleReset = () => {
    audioManager.play("click");
    resetStats();
  };
  
  const statItems = [
    {
      label: "Total Drops",
      value: stats.totalDrops.toLocaleString(),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
        </svg>
      ),
    },
    {
      label: "Total Wagered",
      value: `$${stats.totalBet.toLocaleString()}`,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      label: "Total Won",
      value: `$${stats.totalWon.toLocaleString()}`,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Profit/Loss",
      value: `${profitLoss >= 0 ? "+" : ""}$${profitLoss.toLocaleString()}`,
      color: profitLoss >= 0 ? "text-green-500" : "text-red-500",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      label: "Average Payout",
      value: `$${averagePayout.toFixed(2)}`,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: "Return Rate",
      value: `${returnRate.toFixed(1)}%`,
      color: returnRate >= 100 ? "text-green-500" : returnRate >= 90 ? "text-yellow-500" : "text-red-500",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      ),
    },
    {
      label: "Best Payout",
      value: `$${stats.bestPayout.toLocaleString()}`,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
    },
  ];
  
  return (
    <motion.div
      className="
        bg-white dark:bg-surface-900
        rounded-2xl border border-surface-200 dark:border-surface-800
        shadow-soft overflow-hidden
      "
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-800">
        <h2 className="font-semibold text-surface-900 dark:text-white">
          Statistics
        </h2>
        {stats.totalDrops > 0 && (
          <motion.button
            onClick={handleReset}
            className="
              text-xs text-surface-500 hover:text-surface-700
              dark:text-surface-400 dark:hover:text-surface-200
              transition-colors
            "
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Reset
          </motion.button>
        )}
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-px bg-surface-200 dark:bg-surface-800">
        {statItems.map((item, index) => (
          <motion.div
            key={item.label}
            className="
              px-3 py-3 bg-white dark:bg-surface-900
              flex items-center gap-2
            "
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="text-surface-400 dark:text-surface-500">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-surface-500 dark:text-surface-400 truncate">
                {item.label}
              </div>
              <div className={`text-sm font-semibold truncate ${item.color || "text-surface-900 dark:text-white"}`}>
                {item.value}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Slot histogram */}
      {stats.totalDrops > 0 && (
        <div className="px-4 py-3 border-t border-surface-200 dark:border-surface-800">
          <h3 className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">
            Slot Distribution
          </h3>
          <div className="flex items-end gap-0.5 h-12">
            {Array.from({ length: slotCount }).map((_, index) => {
              const hits = stats.slotHistory[index] || 0;
              const height = maxSlotHits > 0 ? (hits / maxSlotHits) * 100 : 0;
              const isCenter = index === Math.floor(slotCount / 2);
              
              return (
                <motion.div
                  key={index}
                  className="flex-1 relative group"
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(4, height)}%` }}
                  transition={{ delay: index * 0.02, type: "spring", stiffness: 300, damping: 25 }}
                >
                  <div
                    className={`
                      w-full h-full rounded-t-sm
                      ${isCenter
                        ? "bg-primary-500"
                        : "bg-surface-300 dark:bg-surface-600"
                      }
                    `}
                  />
                  
                  {/* Tooltip */}
                  <div className="
                    absolute bottom-full left-1/2 -translate-x-1/2 mb-1
                    px-1.5 py-0.5 rounded
                    bg-surface-800 text-white text-xs
                    opacity-0 group-hover:opacity-100
                    transition-opacity pointer-events-none
                    whitespace-nowrap z-10
                  ">
                    {hits} hits
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-surface-400">Edge</span>
            <span className="text-xs text-surface-400">Center</span>
            <span className="text-xs text-surface-400">Edge</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
