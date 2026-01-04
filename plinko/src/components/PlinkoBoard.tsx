"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlinkoEngine, createPlinkoEngine } from "@/lib/plinkoEngine";
import { audioManager } from "@/lib/audioManager";
import { useGameStore, useRowCount, useSettings, useHighlightedSlot } from "@/store/gameStore";
import { getSlotValues, getSlotColor } from "@/utils/payouts";
import type { RowCount, SimulationMode } from "@/types";

interface PlinkoBoardProps {
  onChipLanded?: (slotIndex: number) => void;
}

export function PlinkoBoard({ onChipLanded }: PlinkoBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PlinkoEngine | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [slotPositions, setSlotPositions] = useState<{ x: number; width: number }[]>([]);
  const [boardHeight, setBoardHeight] = useState(0);
  
  const rowCount = useRowCount();
  const settings = useSettings();
  const highlightedSlot = useHighlightedSlot();
  const riskMode = useGameStore((state) => state.riskMode);
  const recordResult = useGameStore((state) => state.recordResult);
  const decrementActiveChips = useGameStore((state) => state.decrementActiveChips);
  const setHighlightedSlot = useGameStore((state) => state.setHighlightedSlot);
  
  const slotValues = getSlotValues(riskMode, rowCount);
  
  // Initialize engine
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    // Clean up existing engine
    if (engineRef.current) {
      engineRef.current.destroy();
    }
    
    // Create new engine
    const engine = createPlinkoEngine({
      container,
      rows: rowCount,
      onSlotLanded: (chipId, slotIndex) => {
        const result = recordResult(slotIndex);
        decrementActiveChips();
        setHighlightedSlot(slotIndex);
        
        // Play sound
        audioManager.playWin(result.multiplier);
        
        // Clear highlight after animation
        setTimeout(() => {
          setHighlightedSlot(null);
        }, 1500);
        
        onChipLanded?.(slotIndex);
      },
      onPegHit: () => {
        audioManager.play("pegHit");
      },
      onChipCreated: () => {
        audioManager.play("drop");
      },
    });
    
    engineRef.current = engine;
    setIsInitialized(true);
    setSlotPositions(engine.getSlotPositions());
    setBoardHeight(engine.getDimensions().height);
    
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [rowCount, recordResult, decrementActiveChips, setHighlightedSlot, onChipLanded]);
  
  // Handle resize
  useEffect(() => {
    if (!engineRef.current) return;
    
    let resizeTimeout: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (engineRef.current) {
          engineRef.current.resize();
          setSlotPositions(engineRef.current.getSlotPositions());
          setBoardHeight(engineRef.current.getDimensions().height);
        }
      }, 100);
    };
    
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [isInitialized]);
  
  // Update rows
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setRows(rowCount);
      setSlotPositions(engineRef.current.getSlotPositions());
    }
  }, [rowCount]);
  
  // Drop chip function (exposed via ref or called externally)
  const dropChip = useCallback((xPosition?: number, targetSlot?: number) => {
    if (!engineRef.current) return;
    
    const simulationMode: SimulationMode = settings.deterministicMode ? "deterministic" : "physics";
    engineRef.current.dropChip(xPosition, simulationMode, targetSlot);
  }, [settings.deterministicMode]);
  
  // Store dropChip in a global ref for external access
  useEffect(() => {
    (window as unknown as { dropPlinkoChip?: typeof dropChip }).dropPlinkoChip = dropChip;
    return () => {
      delete (window as unknown as { dropPlinkoChip?: typeof dropChip }).dropPlinkoChip;
    };
  }, [dropChip]);
  
  const slotHeight = boardHeight * 0.12;
  
  return (
    <div className="relative w-full h-full">
      {/* Canvas container */}
      <div
        ref={containerRef}
        className="w-full h-full rounded-2xl overflow-hidden"
        style={{ minHeight: "400px" }}
      />
      
      {/* Slot values overlay */}
      <div
        className="absolute bottom-0 left-0 right-0 flex pointer-events-none"
        style={{ height: `${slotHeight}px` }}
      >
        <AnimatePresence>
          {slotPositions.map((slot, index) => {
            const value = slotValues[index];
            const colors = getSlotColor(value?.multiplier || 1);
            const isHighlighted = highlightedSlot === index;
            
            return (
              <motion.div
                key={index}
                className={`
                  flex items-center justify-center text-center
                  ${isHighlighted ? "z-10" : "z-0"}
                `}
                style={{
                  position: "absolute",
                  left: `${slot.x}px`,
                  width: `${slot.width}px`,
                  height: "100%",
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  scale: isHighlighted ? 1.1 : 1,
                }}
                transition={{ 
                  delay: index * 0.02,
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                }}
              >
                <div
                  className={`
                    w-[90%] h-[70%] rounded-lg flex items-center justify-center
                    font-bold text-xs sm:text-sm
                    bg-gradient-to-b ${colors.bg} ${colors.text}
                    ${isHighlighted ? `shadow-lg ${colors.glow} ring-2 ring-white/50` : "shadow-md"}
                    transition-all duration-300
                  `}
                >
                  {value?.label || "1x"}
                </div>
                
                {/* Highlight pulse effect */}
                {isHighlighted && !settings.reducedMotion && (
                  <motion.div
                    className={`
                      absolute inset-0 rounded-lg
                      bg-gradient-to-b ${colors.bg}
                    `}
                    initial={{ opacity: 0.8, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.5 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Export drop function type for external use
export type DropChipFunction = (xPosition?: number, targetSlot?: number) => void;
