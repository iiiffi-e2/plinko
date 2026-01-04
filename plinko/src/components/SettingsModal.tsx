"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSettings, useGameStore } from "@/store/gameStore";
import { audioManager } from "@/lib/audioManager";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const settings = useSettings();
  const updateSettings = useGameStore((state) => state.updateSettings);
  const setBalance = useGameStore((state) => state.setBalance);
  
  const handleToggle = (key: keyof typeof settings) => {
    const newValue = !settings[key];
    updateSettings({ [key]: newValue });
    
    if (key === "soundEnabled") {
      audioManager.setEnabled(newValue);
      if (newValue) {
        audioManager.play("click");
      }
    } else if (key === "darkMode") {
      document.documentElement.classList.toggle("dark", newValue);
      audioManager.play("click");
    } else {
      audioManager.play("click");
    }
  };
  
  const handleResetBalance = () => {
    audioManager.play("click");
    setBalance(10000);
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            className="
              fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              w-full max-w-md mx-4
              bg-white dark:bg-surface-900
              rounded-2xl shadow-soft-lg
              z-50 overflow-hidden
            "
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                Settings
              </h2>
              <motion.button
                onClick={onClose}
                className="
                  p-2 rounded-lg
                  text-surface-500 hover:text-surface-700
                  dark:text-surface-400 dark:hover:text-surface-200
                  hover:bg-surface-100 dark:hover:bg-surface-800
                  transition-colors
                "
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Close settings"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>
            
            {/* Content */}
            <div className="px-6 py-4 space-y-4">
              {/* Sound toggle */}
              <SettingToggle
                label="Sound Effects"
                description="Enable game sounds and audio feedback"
                checked={settings.soundEnabled}
                onChange={() => handleToggle("soundEnabled")}
              />
              
              {/* Reduced motion */}
              <SettingToggle
                label="Reduced Motion"
                description="Minimize animations for accessibility"
                checked={settings.reducedMotion}
                onChange={() => handleToggle("reducedMotion")}
              />
              
              {/* Dark mode */}
              <SettingToggle
                label="Dark Mode"
                description="Use dark color scheme"
                checked={settings.darkMode}
                onChange={() => handleToggle("darkMode")}
              />
              
              {/* Deterministic mode */}
              <div className="pt-2 border-t border-surface-200 dark:border-surface-800">
                <SettingToggle
                  label="Deterministic Mode (Demo)"
                  description="Outcomes follow probability distribution. Animation guided to match. For demos only."
                  checked={settings.deterministicMode}
                  onChange={() => handleToggle("deterministicMode")}
                  warning
                />
              </div>
              
              {/* Reset balance */}
              <div className="pt-4 border-t border-surface-200 dark:border-surface-800">
                <motion.button
                  onClick={handleResetBalance}
                  className="
                    w-full py-3 px-4 rounded-xl
                    bg-surface-100 dark:bg-surface-800
                    text-surface-700 dark:text-surface-300
                    hover:bg-surface-200 dark:hover:bg-surface-700
                    font-medium transition-colors
                  "
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  Reset Balance to $10,000
                </motion.button>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 bg-surface-50 dark:bg-surface-800/50 text-center">
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Plinko Premium Edition • Built with Next.js & Matter.js
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface SettingToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  warning?: boolean;
}

function SettingToggle({ label, description, checked, onChange, warning }: SettingToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-surface-900 dark:text-white">
            {label}
          </span>
          {warning && (
            <span className="px-1.5 py-0.5 text-xs rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              Demo
            </span>
          )}
        </div>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
          {description}
        </p>
      </div>
      
      <motion.button
        onClick={onChange}
        className={`
          relative w-12 h-7 rounded-full
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          dark:focus:ring-offset-surface-900
          ${checked
            ? warning
              ? "bg-amber-500"
              : "bg-primary-500"
            : "bg-surface-300 dark:bg-surface-700"
          }
        `}
        whileTap={{ scale: 0.95 }}
        role="switch"
        aria-checked={checked}
        aria-label={label}
      >
        <motion.div
          className="
            absolute top-1 left-1
            w-5 h-5 rounded-full
            bg-white shadow-sm
          "
          animate={{
            x: checked ? 20 : 0,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </motion.button>
    </div>
  );
}
