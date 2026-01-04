"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  PlinkoBoard,
  TopBar,
  ControlPanel,
  HistoryPanel,
  StatsPanel,
  SettingsModal,
  ResultNotification,
} from "@/components";
import { useSettings, useGameStore } from "@/store/gameStore";
import { audioManager } from "@/lib/audioManager";

export default function GamePage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const settings = useSettings();
  
  // Initialize client-side
  useEffect(() => {
    setIsClient(true);
    
    // Apply dark mode from stored settings
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("plinko-game-storage");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.state?.settings?.darkMode) {
            document.documentElement.classList.add("dark");
          }
        } catch {
          // Ignore parse errors
        }
      }
      
      // Check for prefers-reduced-motion
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion) {
        useGameStore.getState().updateSettings({ reducedMotion: true });
      }
    }
  }, []);
  
  // Sync dark mode
  useEffect(() => {
    if (isClient) {
      document.documentElement.classList.toggle("dark", settings.darkMode);
    }
  }, [settings.darkMode, isClient]);
  
  // Sync audio
  useEffect(() => {
    if (isClient) {
      audioManager.setEnabled(settings.soundEnabled);
    }
  }, [settings.soundEnabled, isClient]);
  
  // Prevent SSR flash
  if (!isClient) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 noise-overlay">
      {/* Top bar */}
      <TopBar onOpenSettings={() => setIsSettingsOpen(true)} />
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Board section */}
          <motion.div
            className="lg:col-span-8 xl:col-span-9"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div
              className="
                relative bg-white dark:bg-surface-900
                rounded-2xl border border-surface-200 dark:border-surface-800
                shadow-soft overflow-hidden
              "
              style={{ height: "min(70vh, 600px)" }}
            >
              <PlinkoBoard />
            </div>
          </motion.div>
          
          {/* Control panel section */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4 sm:space-y-6">
            <ControlPanel />
            
            {/* History panel (hidden on mobile, shown in separate section) */}
            <div className="hidden lg:block">
              <HistoryPanel />
            </div>
          </div>
        </div>
        
        {/* Bottom section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
          {/* History panel (mobile) */}
          <div className="lg:hidden">
            <HistoryPanel />
          </div>
          
          {/* Stats panel */}
          <div className="lg:col-span-1">
            <StatsPanel />
          </div>
          
          {/* History panel (desktop - second column) */}
          <div className="hidden lg:block lg:col-span-1">
            {/* Additional info or leave empty */}
            <InfoPanel />
          </div>
        </div>
      </main>
      
      {/* Result notification */}
      <ResultNotification />
      
      {/* Settings modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      
      {/* Aria live region for results */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        <ResultAnnouncer />
      </div>
    </div>
  );
}

function InfoPanel() {
  return (
    <motion.div
      className="
        bg-white dark:bg-surface-900
        rounded-2xl border border-surface-200 dark:border-surface-800
        shadow-soft p-6
      "
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <h2 className="font-semibold text-surface-900 dark:text-white mb-4">
        How to Play
      </h2>
      
      <div className="space-y-3 text-sm text-surface-600 dark:text-surface-400">
        <div className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold">
            1
          </span>
          <p>Set your bet amount and choose a risk level</p>
        </div>
        
        <div className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold">
            2
          </span>
          <p>Adjust the number of rows to change the board layout</p>
        </div>
        
        <div className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold">
            3
          </span>
          <p>Press DROP to release a chip and watch it bounce through the pegs</p>
        </div>
        
        <div className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold">
            4
          </span>
          <p>Win based on which slot the chip lands in - center slots pay more!</p>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-surface-200 dark:border-surface-700">
        <h3 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
          Risk Levels
        </h3>
        <div className="space-y-1.5 text-xs text-surface-500 dark:text-surface-400">
          <p><strong className="text-green-500">Low:</strong> Steady payouts, lower variance</p>
          <p><strong className="text-blue-500">Balanced:</strong> Mix of risk and reward</p>
          <p><strong className="text-red-500">High:</strong> Big wins possible, higher variance</p>
        </div>
      </div>
    </motion.div>
  );
}

function ResultAnnouncer() {
  const lastResult = useGameStore((state) => state.lastResult);
  
  if (!lastResult) return null;
  
  return (
    <span>
      Chip landed in slot {lastResult.slotIndex + 1} with {lastResult.multiplier}x multiplier. 
      Won ${lastResult.payout} from ${lastResult.betAmount} bet.
    </span>
  );
}
