"use client";

import { motion } from "framer-motion";
import { useBalance, useSettings, useGameStore } from "@/store/gameStore";
import { audioManager } from "@/lib/audioManager";

interface TopBarProps {
  onOpenSettings: () => void;
}

export function TopBar({ onOpenSettings }: TopBarProps) {
  const balance = useBalance();
  const settings = useSettings();
  const updateSettings = useGameStore((state) => state.updateSettings);
  
  const toggleSound = () => {
    const newEnabled = !settings.soundEnabled;
    updateSettings({ soundEnabled: newEnabled });
    audioManager.setEnabled(newEnabled);
    if (newEnabled) {
      audioManager.play("click");
    }
  };
  
  const toggleDarkMode = () => {
    const newDarkMode = !settings.darkMode;
    updateSettings({ darkMode: newDarkMode });
    document.documentElement.classList.toggle("dark", newDarkMode);
    audioManager.play("click");
  };
  
  return (
    <motion.header
      className="
        flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4
        bg-white/80 dark:bg-surface-900/80 backdrop-blur-lg
        border-b border-surface-200 dark:border-surface-800
        shadow-soft
      "
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <motion.div
          className="
            w-10 h-10 rounded-xl
            bg-gradient-to-br from-primary-400 to-primary-600
            flex items-center justify-center
            shadow-glow
          "
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
        </motion.div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-surface-900 dark:text-white">
            Plinko
          </h1>
          <p className="text-xs text-surface-500 dark:text-surface-400 hidden sm:block">
            Premium Edition
          </p>
        </div>
      </div>
      
      {/* Balance */}
      <motion.div
        className="
          flex items-center gap-2 px-4 py-2
          bg-surface-100 dark:bg-surface-800
          rounded-xl border border-surface-200 dark:border-surface-700
        "
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
          <span className="text-xs font-bold text-white">$</span>
        </div>
        <motion.span
          key={balance}
          className="font-semibold text-surface-900 dark:text-white tabular-nums"
          initial={{ scale: 1.2, color: balance > 0 ? "#22c55e" : "#ef4444" }}
          animate={{ scale: 1, color: "inherit" }}
          transition={{ duration: 0.3 }}
        >
          {balance.toLocaleString()}
        </motion.span>
      </motion.div>
      
      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Sound Toggle */}
        <motion.button
          onClick={toggleSound}
          className={`
            p-2 sm:p-2.5 rounded-xl transition-colors
            ${settings.soundEnabled
              ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
              : "bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400"
            }
            hover:bg-surface-200 dark:hover:bg-surface-700
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
            dark:focus:ring-offset-surface-900
          `}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={settings.soundEnabled ? "Mute sound" : "Unmute sound"}
        >
          {settings.soundEnabled ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          )}
        </motion.button>
        
        {/* Dark Mode Toggle */}
        <motion.button
          onClick={toggleDarkMode}
          className="
            p-2 sm:p-2.5 rounded-xl
            bg-surface-100 dark:bg-surface-800
            text-surface-500 dark:text-surface-400
            hover:bg-surface-200 dark:hover:bg-surface-700
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
            dark:focus:ring-offset-surface-900
            transition-colors
          "
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={settings.darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {settings.darkMode ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </motion.button>
        
        {/* Settings Button */}
        <motion.button
          onClick={() => {
            audioManager.play("click");
            onOpenSettings();
          }}
          className="
            p-2 sm:p-2.5 rounded-xl
            bg-surface-100 dark:bg-surface-800
            text-surface-500 dark:text-surface-400
            hover:bg-surface-200 dark:hover:bg-surface-700
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
            dark:focus:ring-offset-surface-900
            transition-colors
          "
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Open settings"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </motion.button>
      </div>
    </motion.header>
  );
}
