export type RiskMode = "low" | "balanced" | "high";

export type RowCount = 8 | 10 | 12 | 14 | 16;

export interface SlotValue {
  multiplier: number;
  label: string;
}

export interface DropResult {
  id: string;
  timestamp: number;
  slotIndex: number;
  multiplier: number;
  betAmount: number;
  payout: number;
  riskMode: RiskMode;
  rowCount: RowCount;
}

export interface GameSettings {
  soundEnabled: boolean;
  reducedMotion: boolean;
  deterministicMode: boolean;
  darkMode: boolean;
}

export interface GameStats {
  totalDrops: number;
  totalWon: number;
  totalBet: number;
  bestPayout: number;
  slotHistory: number[]; // Count of landings per slot
}

export interface BoardConfig {
  rows: RowCount;
  riskMode: RiskMode;
  pegRadius: number;
  chipRadius: number;
  gravity: number;
  restitution: number;
  friction: number;
}

export interface PhysicsConfig {
  gravity: { x: number; y: number };
  restitution: number;
  friction: number;
  frictionAir: number;
}

export interface ChipState {
  id: string;
  body: Matter.Body;
  isSettled: boolean;
  targetSlot?: number; // For deterministic mode
}

export interface SlotSensor {
  body: Matter.Body;
  index: number;
}

export type SimulationMode = "physics" | "deterministic";

export interface DropOptions {
  x: number;
  betAmount: number;
  simulationMode: SimulationMode;
  targetSlot?: number;
}

export interface PlinkoEngineCallbacks {
  onSlotLanded: (chipId: string, slotIndex: number) => void;
  onPegHit: (chipId: string) => void;
  onChipCreated: (chipId: string) => void;
}

export interface BatchDropState {
  isRunning: boolean;
  totalDrops: number;
  completedDrops: number;
  results: DropResult[];
}
