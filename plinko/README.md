# Plinko - Premium Edition

A modern, high-end Plinko web application with smooth physics, delightful micro-interactions, and responsive design. Built with Next.js, Matter.js for physics simulation, and Framer Motion for animations.

![Plinko Game](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue) ![Matter.js](https://img.shields.io/badge/Matter.js-0.20-orange)

## Features

### 🎮 Gameplay
- **Realistic Physics**: Powered by Matter.js for authentic chip bouncing and collision
- **Multiple Risk Modes**: Low, Balanced, and High risk with different payout distributions
- **Configurable Board**: Choose between 8, 10, 12, 14, or 16 rows
- **Batch Dropping**: Drop multiple chips automatically with progress tracking
- **Real-time Results**: Instant feedback with animated payouts

### 🎨 Premium UI
- **Modern Design**: Clean, Apple-inspired aesthetics with soft shadows and rounded corners
- **Dark Mode**: Full dark theme support with system preference detection
- **Responsive Layout**: Works beautifully on desktop, tablet, and mobile
- **Micro-interactions**: Smooth hover effects, button animations, and transitions

### ✨ Animations
- **Framer Motion**: Polished UI animations throughout
- **Result Celebrations**: Confetti bursts for big wins
- **Count-up Animations**: Animated payout counters
- **Slot Highlights**: Visual feedback when chips land

### 🔊 Audio
- **Sound Effects**: Click sounds, chip drops, peg hits, and win celebrations
- **Toggleable**: Sound is off by default, respecting user preferences
- **Rate-limited**: Peg hit sounds don't spam

### ⚙️ Settings
- **Sound Toggle**: Enable/disable all game audio
- **Reduced Motion**: Respect accessibility preferences
- **Dark Mode Toggle**: Switch between light and dark themes
- **Deterministic Mode**: For demos and testing (see below)

### 📊 Statistics & History
- **Complete Stats**: Total drops, wagered, won, profit/loss, return rate
- **Slot Distribution**: Visual histogram of where chips land
- **Drop History**: Last 50 drops with full details
- **Persistent Storage**: All data saved to localStorage

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd plinko

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play.

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm run test     # Run tests in watch mode
npm run test:run # Run tests once
```

## Configuration

### Board Rows

You can adjust the number of rows (8, 10, 12, 14, or 16) directly in the game UI. Each row count affects:
- Number of slots (rows + 1)
- Payout multipliers
- Physics simulation complexity

### Slot Values

Slot values are defined in `src/utils/payouts.ts`. Each risk mode has different distributions:

```typescript
// Example: Balanced mode with 12 rows
// [0.3, 0.5, 0.8, 1.0, 1.5, 2.5, 5.0, 2.5, 1.5, 1.0, 0.8, 0.5, 0.3]
```

To customize payouts, modify the `SLOT_VALUES` object in the payouts utility file.

### Risk Modes

| Mode | Description | Variance |
|------|-------------|----------|
| Low | Consistent payouts near 1x | Low |
| Balanced | Classic Plinko distribution | Medium |
| High | Rare huge wins, many losses | High |

## Deterministic Mode

The game includes a "Deterministic Mode" for demos and testing. When enabled:

### How It Works

1. **Target Selection**: A target slot is pre-selected using weighted probability (binomial distribution)
2. **Biased Start Position**: The chip's initial X position is subtly biased toward the target
3. **Physics Nudges**: Small horizontal forces are applied during the fall to guide the chip
4. **Natural Appearance**: Adjustments are small enough to appear natural

### Technical Details

```typescript
// Target slot selection uses binomial distribution
const probabilities = getSlotProbabilities(rowCount);
const targetSlot = selectTargetSlot(rowCount, seed);

// Initial position is biased toward target (15% of distance)
const bias = (targetX - centerX) * 0.15;
dropX = centerX + bias;

// Subtle force nudges during descent
const force = diff * 0.00002;
Body.applyForce(chip, chip.position, { x: force, y: 0 });
```

### Use Cases

- **Demos**: Show specific outcomes for presentations
- **Testing**: Verify payout calculations
- **Fair Gaming**: Could be extended for provably fair verification

⚠️ **Note**: Deterministic mode is labeled as "Demo" in the UI and should not be used for real gambling applications.

## Project Structure

```
plinko/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── globals.css      # Global styles
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Main game page
│   ├── components/          # React components
│   │   ├── PlinkoBoard.tsx  # Physics board + canvas
│   │   ├── ControlPanel.tsx # Bet controls
│   │   ├── TopBar.tsx       # Header with balance
│   │   ├── HistoryPanel.tsx # Recent drops
│   │   ├── StatsPanel.tsx   # Statistics
│   │   ├── SettingsModal.tsx# Settings dialog
│   │   └── ResultNotification.tsx
│   ├── lib/                 # Core libraries
│   │   ├── plinkoEngine.ts  # Matter.js wrapper
│   │   └── audioManager.ts  # Sound system
│   ├── store/               # State management
│   │   └── gameStore.ts     # Zustand store
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── utils/               # Utilities
│   │   └── payouts.ts       # Payout calculations
│   └── __tests__/           # Unit tests
│       └── payouts.test.ts
├── public/                  # Static assets
├── tailwind.config.ts       # Tailwind configuration
├── tsconfig.json            # TypeScript config
└── package.json
```

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5.3
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion 12
- **Physics**: Matter.js 0.20
- **State**: Zustand 5
- **Audio**: Howler.js 2.2
- **Testing**: Vitest

## Physics Engine

The `PlinkoEngine` class (`src/lib/plinkoEngine.ts`) provides:

```typescript
// Create a new engine
const engine = createPlinkoEngine({
  container: htmlElement,
  rows: 12,
  onSlotLanded: (chipId, slotIndex) => { ... },
  onPegHit: (chipId) => { ... },
  onChipCreated: (chipId) => { ... },
});

// Drop a chip
engine.dropChip(xPosition, simulationMode, targetSlot);

// Resize the board
engine.resize();

// Change row count
engine.setRows(14);

// Clean up
engine.destroy();
```

### Physics Parameters

```typescript
const PHYSICS = {
  gravity: { x: 0, y: 1 },
  chipRestitution: 0.5,    // Bounciness
  chipFriction: 0.1,
  chipFrictionAir: 0.01,
  pegRestitution: 0.8,
  pegFriction: 0.05,
};
```

## Accessibility

- **Keyboard Navigation**: All controls are keyboard accessible
- **Focus States**: Visible focus indicators on all interactive elements
- **ARIA Labels**: Proper labeling for screen readers
- **Reduced Motion**: Respects `prefers-reduced-motion` preference
- **Live Regions**: Results announced via aria-live

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- **60 FPS**: Optimized physics simulation
- **Chip Limit**: Maximum 200 active chips
- **Throttled Resize**: Board recalculates on window resize (debounced)
- **Canvas Rendering**: Custom render loop for smooth visuals
- **Retina Support**: Proper devicePixelRatio handling

## License

MIT License - feel free to use this for personal or commercial projects.

## Acknowledgments

- [Matter.js](https://brm.io/matter-js/) - 2D physics engine
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
- [Howler.js](https://howlerjs.com/) - Audio library
