"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHistory, useGameStore } from "@/store/gameStore";
import { audioManager } from "@/lib/audioManager";
import { formatMultiplier, getSlotColor } from "@/utils/payouts";
import type { DropResult } from "@/types";

interface SessionGroup {
  sessionId: string;
  results: DropResult[];
  totalBet: number;
  totalPayout: number;
  netResult: number;
  timestamp: number;
}

export function HistoryPanel() {
  const history = useHistory();
  const clearHistory = useGameStore((state) => state.clearHistory);
  
  // Group history by session
  const sessions = useMemo(() => {
    const sessionMap = new Map<string, DropResult[]>();
    
    history.forEach((result) => {
      const sessionId = result.sessionId || "legacy"; // Handle old results without sessionId
      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, []);
      }
      sessionMap.get(sessionId)!.push(result);
    });
    
    // Convert to array and calculate totals
    const sessionGroups: SessionGroup[] = Array.from(sessionMap.entries()).map(([sessionId, results]) => {
      // Sort results by timestamp (oldest first within session)
      const sortedResults = [...results].sort((a, b) => a.timestamp - b.timestamp);
      
      const totalBet = sortedResults.reduce((sum, r) => sum + r.betAmount, 0);
      const totalPayout = sortedResults.reduce((sum, r) => sum + r.payout, 0);
      const netResult = totalPayout - totalBet;
      
      return {
        sessionId,
        results: sortedResults,
        totalBet,
        totalPayout,
        netResult,
        timestamp: sortedResults[0]?.timestamp || 0,
      };
    });
    
    // Sort sessions by most recent first
    return sessionGroups.sort((a, b) => b.timestamp - a.timestamp);
  }, [history]);
  
  const handleClear = () => {
    audioManager.play("click");
    clearHistory();
  };
  
  return (
    <motion.div
      className="
        bg-white dark:bg-surface-900
        rounded-2xl border border-surface-200 dark:border-surface-800
        shadow-soft overflow-hidden
      "
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-800">
        <h2 className="font-semibold text-surface-900 dark:text-white">
          Recent Drops
        </h2>
        {history.length > 0 && (
          <motion.button
            onClick={handleClear}
            className="
              text-xs text-surface-500 hover:text-surface-700
              dark:text-surface-400 dark:hover:text-surface-200
              transition-colors
            "
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Clear
          </motion.button>
        )}
      </div>
      
      {/* List */}
      <div className="max-h-64 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {sessions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 py-8 text-center text-surface-400 dark:text-surface-500"
            >
              <svg
                className="w-12 h-12 mx-auto mb-2 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <p className="text-sm">No drops yet</p>
              <p className="text-xs mt-1">Start dropping chips to see history</p>
            </motion.div>
          ) : (
            sessions.map((session, sessionIndex) => {
              const sessionIsWin = session.netResult > 0;
              const sessionIsLoss = session.netResult < 0;
              
              return (
                <motion.div
                  key={session.sessionId}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: sessionIndex * 0.03 }}
                  className="
                    border-b border-surface-200 dark:border-surface-700
                    last:border-0
                  "
                >
                  {/* Session Header with Cumulative Totals */}
                  <div
                    className="
                      px-4 py-2.5
                      bg-surface-50 dark:bg-surface-800/30
                      border-b border-surface-100 dark:border-surface-700
                    "
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-surface-500 dark:text-surface-400">
                          {session.results.length} {session.results.length === 1 ? "ball" : "balls"}
                        </span>
                        <span className="text-surface-300 dark:text-surface-600">•</span>
                        <span className="text-xs text-surface-400 dark:text-surface-500">
                          {new Date(session.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-surface-500 dark:text-surface-400">
                            Bet: ${session.totalBet.toLocaleString()}
                          </div>
                          <div className="text-xs text-surface-500 dark:text-surface-400">
                            Won: ${session.totalPayout.toLocaleString()}
                          </div>
                        </div>
                        <div
                          className={`
                            px-2.5 py-1 rounded-md text-sm font-bold
                            ${sessionIsWin 
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : sessionIsLoss
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              : "bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-400"
                            }
                          `}
                        >
                          {sessionIsWin ? "+" : ""}${session.netResult.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Individual Ball Results */}
                  <div className="divide-y divide-surface-100 dark:divide-surface-800">
                    {session.results.map((result, resultIndex) => {
                      const colors = getSlotColor(result.multiplier);
                      const isWin = result.payout > result.betAmount;
                      const isBigWin = result.multiplier >= 5;
                      
                      return (
                        <motion.div
                          key={result.id}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: (sessionIndex * 0.03) + (resultIndex * 0.01) }}
                          className="
                            flex items-center gap-3 px-4 py-2
                            hover:bg-surface-50 dark:hover:bg-surface-800/50
                            transition-colors
                          "
                        >
                          {/* Multiplier badge */}
                          <div
                            className={`
                              w-12 py-1 rounded-md text-center text-xs font-bold
                              bg-gradient-to-r ${colors.bg} ${colors.text}
                              ${isBigWin ? `shadow-md ${colors.glow}` : ""}
                            `}
                          >
                            {formatMultiplier(result.multiplier)}
                          </div>
                          
                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-surface-600 dark:text-surface-400">
                                ${result.betAmount.toLocaleString()}
                              </span>
                              <span className="text-surface-300 dark:text-surface-600">→</span>
                              <span
                                className={`
                                  text-xs font-semibold
                                  ${isWin ? "text-green-500" : "text-surface-500"}
                                `}
                              >
                                ${result.payout.toLocaleString()}
                              </span>
                            </div>
                            <div className="text-xs text-surface-400 dark:text-surface-500">
                              Slot {result.slotIndex + 1}
                              {" • "}
                              {result.riskMode} risk
                            </div>
                          </div>
                          
                          {/* Win indicator */}
                          {isBigWin && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="
                                px-1.5 py-0.5 rounded-full
                                bg-gradient-to-r from-yellow-400 to-orange-500
                                text-white text-xs font-bold
                              "
                            >
                              WIN!
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
