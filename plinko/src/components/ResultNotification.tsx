"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLastResult, useSettings } from "@/store/gameStore";
import { formatMultiplier, getSlotColor } from "@/utils/payouts";

export function ResultNotification() {
  const lastResult = useLastResult();
  const settings = useSettings();
  const [visible, setVisible] = useState(false);
  const [currentResult, setCurrentResult] = useState(lastResult);
  
  useEffect(() => {
    if (lastResult && lastResult !== currentResult) {
      setCurrentResult(lastResult);
      setVisible(true);
      
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2500);
      
      return () => clearTimeout(timer);
    }
  }, [lastResult, currentResult]);
  
  if (!currentResult) return null;
  
  const isWin = currentResult.payout > currentResult.betAmount;
  const isBigWin = currentResult.multiplier >= 5;
  const isHugeWin = currentResult.multiplier >= 20;
  const colors = getSlotColor(currentResult.multiplier);
  
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute top-4 right-4 pointer-events-none z-30 max-w-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Result card */}
          <motion.div
            className={`
              relative px-8 py-6 rounded-2xl
              bg-white/95 dark:bg-surface-900/95 backdrop-blur-lg
              shadow-soft-lg border border-surface-200 dark:border-surface-700
              text-center
            `}
            initial={{ scale: 0.5, x: 50, y: -50, opacity: 0 }}
            animate={{ scale: 1, x: 0, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, x: 20, y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            {/* Multiplier */}
            <motion.div
              className={`
                inline-block px-4 py-2 rounded-xl mb-3
                bg-gradient-to-r ${colors.bg}
                ${isBigWin ? `shadow-lg ${colors.glow}` : "shadow-md"}
              `}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
            >
              <span className={`text-2xl font-bold ${colors.text}`}>
                {formatMultiplier(currentResult.multiplier)}
              </span>
            </motion.div>
            
            {/* Win/Loss label */}
            {isBigWin && (
              <motion.div
                className="mb-2"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span
                  className={`
                    text-lg font-bold
                    ${isHugeWin ? "text-yellow-500" : "text-green-500"}
                  `}
                >
                  {isHugeWin ? "🎉 HUGE WIN! 🎉" : "🎯 NICE WIN!"}
                </span>
              </motion.div>
            )}
            
            {/* Payout counter */}
            <motion.div
              className="text-4xl font-bold text-surface-900 dark:text-white"
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: "spring" }}
            >
              <CountUp
                value={currentResult.payout}
                duration={isBigWin ? 1000 : 500}
              />
            </motion.div>
            
            {/* Bet info */}
            <motion.div
              className="mt-2 text-sm text-surface-500 dark:text-surface-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              from ${currentResult.betAmount.toLocaleString()} bet
              {isWin && (
                <span className="text-green-500 ml-2">
                  (+${(currentResult.payout - currentResult.betAmount).toLocaleString()})
                </span>
              )}
            </motion.div>
            
            {/* Background pulse for big wins - centered on card */}
            {isBigWin && !settings.reducedMotion && (
              <motion.div
                className={`
                  absolute inset-0 rounded-2xl
                  bg-gradient-radial from-transparent via-transparent
                  ${isHugeWin ? "to-yellow-500/10" : "to-primary-500/10"}
                  pointer-events-none
                `}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5 }}
              />
            )}
          </motion.div>
          
          {/* Confetti for huge wins */}
          {isHugeWin && !settings.reducedMotion && <Confetti />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface CountUpProps {
  value: number;
  duration: number;
}

function CountUp({ value, duration }: CountUpProps) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const startTime = Date.now();
    const startValue = 0;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startValue + (value - startValue) * eased);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [value, duration]);
  
  return <>${displayValue.toLocaleString()}</>;
}

function Confetti() {
  const particles = Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100 - 50,
    rotation: Math.random() * 360,
    color: ["#fbbf24", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"][Math.floor(Math.random() * 5)],
  }));
  
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-20">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-3 h-3"
          style={{
            left: "calc(100% - 200px)",
            top: "80px",
            backgroundColor: particle.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "0",
          }}
          initial={{
            x: 0,
            y: 0,
            scale: 0,
            rotate: 0,
          }}
          animate={{
            x: particle.x * 8,
            y: [0, -150, 300],
            scale: [0, 1, 0.5],
            rotate: particle.rotation * 3,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 2,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}
