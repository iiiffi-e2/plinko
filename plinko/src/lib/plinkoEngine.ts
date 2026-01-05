import Matter from "matter-js";
import type { RowCount, SimulationMode, PlinkoEngineCallbacks } from "@/types";
import { selectTargetSlot } from "@/utils/payouts";

const {
  Engine,
  Render,
  Runner,
  Bodies,
  Body,
  Composite,
  Events,
  World,
} = Matter;

interface PlinkoEngineConfig {
  container: HTMLElement;
  rows: RowCount;
  onSlotLanded: (chipId: string, slotIndex: number) => void;
  onPegHit?: (chipId: string) => void;
  onChipCreated?: (chipId: string) => void;
}

interface ChipData {
  id: string;
  targetSlot?: number;
  hasLanded: boolean;
  createdAt: number;
  lastPosition?: { x: number; y: number };
  stuckCheckTime?: number;
}

// Physics constants - tuned for more chaotic/random behavior
const PHYSICS = {
  gravity: { x: 0, y: 1 },
  // Base chip physics - will be randomized per chip
  chipRestitutionBase: 0.65,
  chipRestitutionVariance: 0.15,
  chipFrictionBase: 0.08,
  chipFrictionVariance: 0.04,
  chipFrictionAir: 0.01,
  // Peg physics - higher restitution for more bounce
  pegRestitution: 0.85,
  pegFriction: 0.03,
  wallRestitution: 0.4,
  // Collision randomization - adds chaos on peg hits
  collisionForceMin: 0.00003,
  collisionForceMax: 0.00012,
};

// Visual constants
const VISUAL = {
  pegColor: "#94a3b8",
  chipColor: "#0ea5e9",
  wallColor: "#1e293b",
  slotDividerColor: "#334155",
  backgroundColor: "#0f172a",
};

export class PlinkoEngine {
  private engine: Matter.Engine;
  private render: Matter.Render;
  private runner: Matter.Runner;
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  
  private rows: RowCount;
  private callbacks: PlinkoEngineCallbacks;
  
  private pegs: Matter.Body[] = [];
  private walls: Matter.Body[] = [];
  private slotSensors: Matter.Body[] = [];
  private slotDividers: Matter.Body[] = [];
  private chips: Map<string, ChipData> = new Map();
  
  private width: number = 0;
  private height: number = 0;
  private pegRadius: number = 0;
  private chipRadius: number = 0;
  private pegSpacingX: number = 0;
  private pegSpacingY: number = 0;
  private boardPadding: number = 0;
  private slotHeight: number = 0;
  
  private animationFrame: number | null = null;
  private isDestroyed: boolean = false;
  
  constructor(config: PlinkoEngineConfig) {
    this.container = config.container;
    this.rows = config.rows;
    this.callbacks = {
      onSlotLanded: config.onSlotLanded,
      onPegHit: config.onPegHit || (() => {}),
      onChipCreated: config.onChipCreated || (() => {}),
    };
    
    // Create engine with optimized settings
    this.engine = Engine.create({
      gravity: PHYSICS.gravity,
      enableSleeping: true,
      constraintIterations: 4,
      positionIterations: 8,
      velocityIterations: 8,
    });
    
    // Calculate dimensions
    this.calculateDimensions();
    
    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width * window.devicePixelRatio;
    this.canvas.height = this.height * window.devicePixelRatio;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.container.appendChild(this.canvas);
    
    // Create render (for debug, we'll use custom render)
    this.render = Render.create({
      canvas: this.canvas,
      engine: this.engine,
      options: {
        width: this.width,
        height: this.height,
        wireframes: false,
        background: "transparent",
        pixelRatio: window.devicePixelRatio,
      },
    });
    
    // Create runner
    this.runner = Runner.create({
      isFixed: true,
      delta: 1000 / 60,
    });
    
    // Build the world
    this.buildWorld();
    
    // Set up collision detection
    this.setupCollisionDetection();
    
    // Start the engine
    Runner.run(this.runner, this.engine);
    
    // Start custom render loop
    this.startRenderLoop();
  }
  
  private calculateDimensions(): void {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    
    // Calculate sizes based on dimensions and row count
    const minDimension = Math.min(this.width, this.height);
    this.pegRadius = Math.max(3, minDimension / (this.rows * 4));
    // Reduce chip size to prevent getting stuck - chips should be smaller than pegs or same size
    this.chipRadius = this.pegRadius * 0.9; // Chips are now 90% of peg size
    
    this.boardPadding = this.width * 0.08;
    const usableWidth = this.width - this.boardPadding * 2;
    
    this.pegSpacingX = usableWidth / (this.rows + 1);
    this.pegSpacingY = (this.height * 0.75) / (this.rows + 1);
    this.slotHeight = this.height * 0.12;
  }
  
  private buildWorld(): void {
    // Clear existing bodies
    World.clear(this.engine.world, false);
    this.pegs = [];
    this.walls = [];
    this.slotSensors = [];
    this.slotDividers = [];
    
    // Create pegs
    this.createPegs();
    
    // Create walls
    this.createWalls();
    
    // Create slot sensors and dividers
    this.createSlots();
    
    // Add all bodies to world
    Composite.add(this.engine.world, [
      ...this.pegs,
      ...this.walls,
      ...this.slotSensors,
      ...this.slotDividers,
    ]);
  }
  
  private createPegs(): void {
    const startY = this.pegSpacingY * 1.5;
    
    for (let row = 0; row < this.rows; row++) {
      const pegsInRow = row + 3;
      const rowWidth = (pegsInRow - 1) * this.pegSpacingX;
      const startX = (this.width - rowWidth) / 2;
      
      for (let col = 0; col < pegsInRow; col++) {
        const x = startX + col * this.pegSpacingX;
        const y = startY + row * this.pegSpacingY;
        
        const peg = Bodies.circle(x, y, this.pegRadius, {
          isStatic: true,
          restitution: PHYSICS.pegRestitution,
          friction: PHYSICS.pegFriction,
          label: "peg",
          render: {
            fillStyle: VISUAL.pegColor,
          },
        });
        
        this.pegs.push(peg);
      }
    }
  }
  
  private createWalls(): void {
    const wallThickness = 20;
    
    // Left wall - positioned to catch any balls that go off the left side
    // Extend well above the board to catch balls at the top
    const leftWall = Bodies.rectangle(
      -wallThickness / 2,
      this.height / 2,
      wallThickness,
      this.height * 2.5, // Taller to catch balls at top
      {
        isStatic: true,
        restitution: PHYSICS.wallRestitution,
        friction: 0.1,
        label: "wall",
        render: { fillStyle: VISUAL.wallColor },
      }
    );
    
    // Right wall - positioned to catch any balls that go off the right side
    // Extend well above the board to catch balls at the top
    const rightWall = Bodies.rectangle(
      this.width + wallThickness / 2,
      this.height / 2,
      wallThickness,
      this.height * 2.5, // Taller to catch balls at top
      {
        isStatic: true,
        restitution: PHYSICS.wallRestitution,
        friction: 0.1,
        label: "wall",
        render: { fillStyle: VISUAL.wallColor },
      }
    );
    
    // Top wall/guide - helps prevent balls from getting stuck at the top
    // Positioned just above the drop zone to guide balls downward
    const topWall = Bodies.rectangle(
      this.width / 2,
      -wallThickness / 2,
      this.width * 1.5, // Wide enough to catch any stray balls
      wallThickness,
      {
        isStatic: true,
        restitution: 0.2, // Low restitution to prevent bouncing back up
        friction: 0.1,
        label: "topWall",
        render: { fillStyle: VISUAL.wallColor },
      }
    );
    
    // Bottom wall
    const bottomWall = Bodies.rectangle(
      this.width / 2,
      this.height + wallThickness / 2,
      this.width,
      wallThickness,
      {
        isStatic: true,
        label: "bottom",
        render: { fillStyle: VISUAL.wallColor },
      }
    );
    
    this.walls.push(leftWall, rightWall, topWall, bottomWall);
  }
  
  private createSlots(): void {
    const slotCount = this.rows + 1;
    const slotWidth = (this.width - this.boardPadding * 2) / slotCount;
    const slotY = this.height - this.slotHeight / 2;
    const dividerHeight = this.slotHeight;
    const dividerWidth = 4;
    
    // Create slot sensors (invisible sensors to detect chip landing)
    for (let i = 0; i < slotCount; i++) {
      const x = this.boardPadding + slotWidth / 2 + i * slotWidth;
      
      const sensor = Bodies.rectangle(x, slotY, slotWidth - dividerWidth, this.slotHeight * 0.8, {
        isStatic: true,
        isSensor: true,
        label: `slot-${i}`,
        render: { visible: false },
      });
      
      this.slotSensors.push(sensor);
    }
    
    // Create slot dividers
    for (let i = 0; i <= slotCount; i++) {
      const x = this.boardPadding + i * slotWidth;
      
      const divider = Bodies.rectangle(x, slotY, dividerWidth, dividerHeight, {
        isStatic: true,
        restitution: 0.3,
        label: "divider",
        render: { fillStyle: VISUAL.slotDividerColor },
      });
      
      this.slotDividers.push(divider);
    }
  }
  
  private setupCollisionDetection(): void {
    Events.on(this.engine, "collisionStart", (event) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair;
        
        // Check for peg collisions and apply random force
        if (bodyA.label === "peg" || bodyB.label === "peg") {
          const chip = bodyA.label?.startsWith("chip-") ? bodyA : 
                       bodyB.label?.startsWith("chip-") ? bodyB : null;
          if (chip) {
            const chipId = chip.label!.replace("chip-", "");
            this.callbacks.onPegHit(chipId);
            
            // Apply random horizontal force on peg collision for more chaos
            this.applyCollisionRandomness(chip);
          }
        }
        
        // Check for slot sensor collisions
        const slotBody = bodyA.label?.startsWith("slot-") ? bodyA :
                         bodyB.label?.startsWith("slot-") ? bodyB : null;
        const chipBody = bodyA.label?.startsWith("chip-") ? bodyA :
                         bodyB.label?.startsWith("chip-") ? bodyB : null;
        
        if (slotBody && chipBody) {
          const chipId = chipBody.label!.replace("chip-", "");
          const chipData = this.chips.get(chipId);
          
          if (chipData && !chipData.hasLanded) {
            const slotIndex = parseInt(slotBody.label!.replace("slot-", ""), 10);
            chipData.hasLanded = true;
            
            // Small delay to ensure chip has settled
            setTimeout(() => {
              this.callbacks.onSlotLanded(chipId, slotIndex);
              this.removeChip(chipId);
            }, 100);
          }
        }
      }
    });
  }
  
  /**
   * Apply random horizontal force when chip hits a peg
   * This creates more unpredictable bouncing behavior
   */
  private applyCollisionRandomness(chip: Matter.Body): void {
    // Random force magnitude
    const forceMagnitude = PHYSICS.collisionForceMin + 
      Math.random() * (PHYSICS.collisionForceMax - PHYSICS.collisionForceMin);
    
    // Random direction (left or right) with slight bias based on position
    // This helps prevent chips from always going one way
    const centerX = this.width / 2;
    const chipX = chip.position.x;
    const positionBias = (centerX - chipX) / this.width * 0.3; // Slight bias toward center
    
    const direction = Math.random() < (0.5 + positionBias) ? 1 : -1;
    
    // Apply the random force
    Body.applyForce(chip, chip.position, {
      x: forceMagnitude * direction,
      y: 0,
    });
    
    // Also add a small random angular velocity for spin
    const currentAngularVel = chip.angularVelocity;
    Body.setAngularVelocity(chip, currentAngularVel + (Math.random() - 0.5) * 0.1);
  }
  
  private startRenderLoop(): void {
    const render = () => {
      if (this.isDestroyed) return;
      
      // Check for stuck balls and unstick them
      this.checkAndUnstickBalls();
      
      this.customRender();
      this.animationFrame = requestAnimationFrame(render);
    };
    
    render();
  }
  
  private checkAndUnstickBalls(): void {
    const now = Date.now();
    const stuckThreshold = 500; // 0.5 seconds - more aggressive
    const minMovement = 1.5; // pixels - detect smaller movements
    
    this.chips.forEach((chipData, chipId) => {
      if (chipData.hasLanded) return;
      
      const bodies = Composite.allBodies(this.engine.world);
      const chip = bodies.find((b) => b.label === `chip-${chipId}`);
      if (!chip) return;
      
      const currentPos = { x: chip.position.x, y: chip.position.y };
      
      if (!chipData.lastPosition) {
        // First check - just record position
        chipData.lastPosition = currentPos;
        chipData.stuckCheckTime = now;
        return;
      }
      
      // Check if ball has moved significantly
      const distance = Math.sqrt(
        Math.pow(currentPos.x - chipData.lastPosition.x, 2) +
        Math.pow(currentPos.y - chipData.lastPosition.y, 2)
      );
      
      if (distance < minMovement) {
        // Ball hasn't moved much
        if (!chipData.stuckCheckTime) {
          chipData.stuckCheckTime = now;
        } else if (now - chipData.stuckCheckTime > stuckThreshold) {
          // Ball has been stuck for too long - give it a nudge
          const velocity = chip.velocity;
          const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
          
          if (speed < 0.2) {
            // Ball is essentially stationary - apply a stronger force to unstick it
            const angle = Math.random() * Math.PI * 2;
            const force = 0.001; // Stronger force
            Body.applyForce(chip, chip.position, {
              x: Math.cos(angle) * force,
              y: Math.sin(angle) * force + 0.0008, // Stronger downward bias
            });
            
            // Also give it a velocity boost
            const currentVel = chip.velocity;
            Body.setVelocity(chip, {
              x: currentVel.x + (Math.random() - 0.5) * 0.3,
              y: currentVel.y + 0.5 + Math.random() * 0.5, // Strong downward push
            });
            
            // Reset stuck check
            chipData.stuckCheckTime = now;
            chipData.lastPosition = currentPos;
          }
        }
      } else {
        // Ball is moving - reset stuck check
        chipData.lastPosition = currentPos;
        chipData.stuckCheckTime = undefined;
      }
    });
  }
  
  private customRender(): void {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    // Clear canvas
    ctx.clearRect(0, 0, this.width, this.height);
    
    // Draw background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGradient.addColorStop(0, "#0f172a");
    bgGradient.addColorStop(1, "#1e293b");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw pegs with glow effect
    this.pegs.forEach((peg) => {
      const { x, y } = peg.position;
      
      // Outer glow
      const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, this.pegRadius * 2);
      glowGradient.addColorStop(0, "rgba(148, 163, 184, 0.3)");
      glowGradient.addColorStop(1, "rgba(148, 163, 184, 0)");
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(x, y, this.pegRadius * 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Peg body
      const pegGradient = ctx.createRadialGradient(
        x - this.pegRadius * 0.3,
        y - this.pegRadius * 0.3,
        0,
        x,
        y,
        this.pegRadius
      );
      pegGradient.addColorStop(0, "#e2e8f0");
      pegGradient.addColorStop(0.5, "#94a3b8");
      pegGradient.addColorStop(1, "#64748b");
      
      ctx.fillStyle = pegGradient;
      ctx.beginPath();
      ctx.arc(x, y, this.pegRadius, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw slot dividers
    this.slotDividers.forEach((divider) => {
      const { x, y } = divider.position;
      const bounds = divider.bounds;
      const width = bounds.max.x - bounds.min.x;
      const height = bounds.max.y - bounds.min.y;
      
      const dividerGradient = ctx.createLinearGradient(x - width / 2, y, x + width / 2, y);
      dividerGradient.addColorStop(0, "#475569");
      dividerGradient.addColorStop(0.5, "#64748b");
      dividerGradient.addColorStop(1, "#475569");
      
      ctx.fillStyle = dividerGradient;
      ctx.fillRect(x - width / 2, y - height / 2, width, height);
    });
    
    // Draw chips
    const chipBodies = Composite.allBodies(this.engine.world).filter(
      (body) => body.label?.startsWith("chip-")
    );
    
    chipBodies.forEach((chip) => {
      const { x, y } = chip.position;
      
      // Chip glow
      const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, this.chipRadius * 2);
      glowGradient.addColorStop(0, "rgba(14, 165, 233, 0.4)");
      glowGradient.addColorStop(1, "rgba(14, 165, 233, 0)");
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(x, y, this.chipRadius * 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Chip body
      const chipGradient = ctx.createRadialGradient(
        x - this.chipRadius * 0.3,
        y - this.chipRadius * 0.3,
        0,
        x,
        y,
        this.chipRadius
      );
      chipGradient.addColorStop(0, "#38bdf8");
      chipGradient.addColorStop(0.6, "#0ea5e9");
      chipGradient.addColorStop(1, "#0284c7");
      
      ctx.fillStyle = chipGradient;
      ctx.beginPath();
      ctx.arc(x, y, this.chipRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Chip highlight
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, this.chipRadius * 0.7, -Math.PI * 0.8, -Math.PI * 0.2);
      ctx.stroke();
    });
  }
  
  /**
   * Generate randomized chip physics properties
   * Each chip gets slightly different restitution and friction
   */
  private getRandomizedChipPhysics(): { restitution: number; friction: number } {
    const restitution = PHYSICS.chipRestitutionBase + 
      (Math.random() - 0.5) * 2 * PHYSICS.chipRestitutionVariance;
    const friction = PHYSICS.chipFrictionBase + 
      (Math.random() - 0.5) * 2 * PHYSICS.chipFrictionVariance;
    
    return {
      restitution: Math.max(0.3, Math.min(0.9, restitution)),
      friction: Math.max(0.02, Math.min(0.15, friction)),
    };
  }
  
  public dropChip(
    xPosition?: number,
    simulationMode: SimulationMode = "physics",
    targetSlot?: number
  ): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate drop position with WIDER variance for more randomness
    const safeMargin = this.chipRadius + this.pegRadius + 10;
    const minX = this.boardPadding + safeMargin;
    const maxX = this.width - this.boardPadding - safeMargin;
    
    let dropX: number;
    if (xPosition !== undefined) {
      // Use provided position (percentage 0-1)
      dropX = minX + xPosition * (maxX - minX);
    } else {
      // Random position with MUCH wider variance
      // This spreads drops across more of the board for varied outcomes
      const centerX = this.width / 2;
      const dropRange = (maxX - minX) * 0.7; // Use 70% of available width
      dropX = centerX + (Math.random() - 0.5) * dropRange;
    }
    
    // Clamp dropX to safe boundaries
    dropX = Math.max(minX, Math.min(maxX, dropX));
    
    // Drop position should be well above the first row of pegs
    const firstPegY = this.pegSpacingY * 1.5;
    const dropY = Math.max(this.chipRadius * 1.5, firstPegY - this.chipRadius * 4);
    
    // Get randomized physics for this specific chip
    let { restitution, friction } = this.getRandomizedChipPhysics();
    const frictionAir = PHYSICS.chipFrictionAir;
    
    let finalTargetSlot = targetSlot;
    
    if (simulationMode === "deterministic") {
      // Select target slot if not provided
      if (finalTargetSlot === undefined) {
        finalTargetSlot = selectTargetSlot(this.rows);
      }
      
      // Adjust initial position to bias toward target slot
      const slotCount = this.rows + 1;
      const slotWidth = (this.width - this.boardPadding * 2) / slotCount;
      const targetX = this.boardPadding + slotWidth / 2 + finalTargetSlot * slotWidth;
      
      // Bias start position toward target (subtle)
      const bias = (targetX - this.width / 2) * 0.15;
      dropX = this.width / 2 + bias + (Math.random() - 0.5) * this.pegSpacingX * 0.3;
      
      // Clamp to valid range (using the safe boundaries already calculated above)
      dropX = Math.max(minX, Math.min(maxX, dropX));
      
      // Slightly adjust physics to help reach target
      restitution = 0.4 + Math.random() * 0.15;
      friction = 0.08 + Math.random() * 0.04;
    }
    
    // Create chip body with randomized physics
    const chip = Bodies.circle(dropX, dropY, this.chipRadius, {
      restitution,
      friction,
      frictionAir,
      label: `chip-${id}`,
      render: {
        fillStyle: VISUAL.chipColor,
      },
    });
    
    // Add initial velocity with randomization
    // Wider horizontal variance and varied downward speed
    const initialVelX = (Math.random() - 0.5) * 2.0; // Increased from 0.8
    const initialVelY = 1.5 + Math.random() * 1.5; // Varied downward velocity
    
    Body.setVelocity(chip, {
      x: initialVelX,
      y: initialVelY,
    });
    
    // Add random initial angular velocity (spin)
    const initialAngularVel = (Math.random() - 0.5) * 0.15;
    Body.setAngularVelocity(chip, initialAngularVel);
    
    // Store chip data
    this.chips.set(id, {
      id,
      targetSlot: finalTargetSlot,
      hasLanded: false,
      createdAt: Date.now(),
    });
    
    // Add to world
    Composite.add(this.engine.world, chip);
    
    // Callback
    this.callbacks.onChipCreated(id);
    
    // Apply periodic nudges in deterministic mode
    if (simulationMode === "deterministic" && finalTargetSlot !== undefined) {
      this.applyDeterministicNudges(chip, finalTargetSlot);
    }
    
    return id;
  }
  
  private applyDeterministicNudges(chip: Matter.Body, targetSlot: number): void {
    const slotCount = this.rows + 1;
    const slotWidth = (this.width - this.boardPadding * 2) / slotCount;
    const targetX = this.boardPadding + slotWidth / 2 + targetSlot * slotWidth;
    
    let nudgeCount = 0;
    const maxNudges = Math.floor(this.rows / 2);
    
    const nudgeInterval = setInterval(() => {
      if (this.isDestroyed || nudgeCount >= maxNudges) {
        clearInterval(nudgeInterval);
        return;
      }
      
      const chipData = this.chips.get(chip.label!.replace("chip-", ""));
      if (!chipData || chipData.hasLanded) {
        clearInterval(nudgeInterval);
        return;
      }
      
      // Only nudge if chip is in the middle portion of the board
      const progress = chip.position.y / (this.height - this.slotHeight);
      if (progress > 0.3 && progress < 0.85) {
        const currentX = chip.position.x;
        const diff = targetX - currentX;
        
        // Apply very subtle horizontal force
        if (Math.abs(diff) > slotWidth * 0.3) {
          const force = diff * 0.00002 * (Math.random() + 0.5);
          Body.applyForce(chip, chip.position, { x: force, y: 0 });
        }
      }
      
      nudgeCount++;
    }, 150);
  }
  
  private removeChip(chipId: string): void {
    const bodies = Composite.allBodies(this.engine.world);
    const chip = bodies.find((b) => b.label === `chip-${chipId}`);
    
    if (chip) {
      Composite.remove(this.engine.world, chip);
    }
    
    this.chips.delete(chipId);
  }
  
  public resize(): void {
    this.calculateDimensions();
    
    // Update canvas size
    this.canvas.width = this.width * window.devicePixelRatio;
    this.canvas.height = this.height * window.devicePixelRatio;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    
    // Rebuild world with new dimensions
    this.buildWorld();
  }
  
  public setRows(rows: RowCount): void {
    this.rows = rows;
    this.calculateDimensions();
    this.buildWorld();
  }
  
  public getSlotPositions(): { x: number; width: number }[] {
    const slotCount = this.rows + 1;
    const slotWidth = (this.width - this.boardPadding * 2) / slotCount;
    
    const positions: { x: number; width: number }[] = [];
    for (let i = 0; i < slotCount; i++) {
      positions.push({
        x: this.boardPadding + i * slotWidth,
        width: slotWidth,
      });
    }
    
    return positions;
  }
  
  public getDropZone(): { x: number; y: number; width: number } {
    const safeMargin = this.chipRadius + this.pegRadius + 10;
    const minX = this.boardPadding + safeMargin;
    const maxX = this.width - this.boardPadding - safeMargin;
    const firstPegY = this.pegSpacingY * 1.5;
    const dropY = Math.max(this.chipRadius * 1.5, firstPegY - this.chipRadius * 4);
    
    return {
      x: minX,
      y: dropY,
      width: maxX - minX,
    };
  }
  
  public getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
  
  public getActiveChipCount(): number {
    return this.chips.size;
  }
  
  public destroy(): void {
    this.isDestroyed = true;
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    Runner.stop(this.runner);
    Render.stop(this.render);
    World.clear(this.engine.world, false);
    Engine.clear(this.engine);
    
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    this.chips.clear();
  }
}

// Factory function for creating engine
export function createPlinkoEngine(config: PlinkoEngineConfig): PlinkoEngine {
  return new PlinkoEngine(config);
}
