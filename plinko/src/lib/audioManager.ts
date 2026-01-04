"use client";

import { Howl, Howler } from "howler";

// Sound effect types
type SoundType = "click" | "drop" | "pegHit" | "land" | "win" | "bigWin";

interface AudioManagerConfig {
  enabled: boolean;
}

class AudioManager {
  private sounds: Map<SoundType, Howl> = new Map();
  private enabled: boolean = false;
  private initialized: boolean = false;
  private lastPegHitTime: number = 0;
  private pegHitCooldown: number = 50; // ms between peg hit sounds
  
  constructor() {
    // Don't initialize sounds until user interaction
  }
  
  public init(): void {
    if (this.initialized) return;
    
    // Use synthesized sounds (base64 encoded tiny audio files)
    // In production, you'd use actual audio files in /public/sounds/
    
    // Create simple beep sounds using oscillator-based audio
    this.createSynthSounds();
    this.initialized = true;
  }
  
  private createSynthSounds(): void {
    // For a production app, load real audio files:
    // this.sounds.set('click', new Howl({ src: ['/sounds/click.mp3'] }));
    
    // Using synthesized sounds via Web Audio API fallback
    // These are placeholder implementations - in production use real audio files
    
    const clickSound = new Howl({
      src: [this.generateClickSound()],
      volume: 0.3,
      format: ["wav"],
    });
    
    const dropSound = new Howl({
      src: [this.generateDropSound()],
      volume: 0.4,
      format: ["wav"],
    });
    
    const pegHitSound = new Howl({
      src: [this.generatePegHitSound()],
      volume: 0.15,
      format: ["wav"],
    });
    
    const landSound = new Howl({
      src: [this.generateLandSound()],
      volume: 0.5,
      format: ["wav"],
    });
    
    const winSound = new Howl({
      src: [this.generateWinSound()],
      volume: 0.5,
      format: ["wav"],
    });
    
    const bigWinSound = new Howl({
      src: [this.generateBigWinSound()],
      volume: 0.6,
      format: ["wav"],
    });
    
    this.sounds.set("click", clickSound);
    this.sounds.set("drop", dropSound);
    this.sounds.set("pegHit", pegHitSound);
    this.sounds.set("land", landSound);
    this.sounds.set("win", winSound);
    this.sounds.set("bigWin", bigWinSound);
  }
  
  // Generate simple WAV sounds programmatically
  private generateClickSound(): string {
    return this.createWavDataUrl(440, 0.05, "sine", 0.3);
  }
  
  private generateDropSound(): string {
    return this.createWavDataUrl(220, 0.1, "sine", 0.4, true);
  }
  
  private generatePegHitSound(): string {
    return this.createWavDataUrl(800 + Math.random() * 400, 0.02, "sine", 0.2);
  }
  
  private generateLandSound(): string {
    return this.createWavDataUrl(300, 0.15, "sine", 0.5);
  }
  
  private generateWinSound(): string {
    return this.createWavDataUrl(523, 0.2, "sine", 0.5);
  }
  
  private generateBigWinSound(): string {
    return this.createWavDataUrl(659, 0.3, "sine", 0.6);
  }
  
  private createWavDataUrl(
    frequency: number,
    duration: number,
    _waveType: string,
    volume: number,
    sweep: boolean = false
  ): string {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * duration);
    const numChannels = 1;
    const bitsPerSample = 16;
    
    // Create WAV header
    const dataSize = numSamples * numChannels * (bitsPerSample / 8);
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    
    // RIFF header
    this.writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, "WAVE");
    
    // fmt chunk
    this.writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    
    // data chunk
    this.writeString(view, 36, "data");
    view.setUint32(40, dataSize, true);
    
    // Generate samples
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 10) * volume;
      const freq = sweep ? frequency * (1 - t * 2) : frequency;
      const sample = Math.sin(2 * Math.PI * freq * t) * envelope;
      const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
      view.setInt16(44 + i * 2, intSample, true);
    }
    
    // Convert to base64
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return "data:audio/wav;base64," + btoa(binary);
  }
  
  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }
  
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled && !this.initialized) {
      this.init();
    }
    Howler.mute(!enabled);
  }
  
  public isEnabled(): boolean {
    return this.enabled;
  }
  
  public play(sound: SoundType): void {
    if (!this.enabled || !this.initialized) return;
    
    // Rate limit peg hits
    if (sound === "pegHit") {
      const now = Date.now();
      if (now - this.lastPegHitTime < this.pegHitCooldown) {
        return;
      }
      this.lastPegHitTime = now;
      
      // Randomize pitch slightly for peg hits
      const pegSound = this.sounds.get("pegHit");
      if (pegSound) {
        pegSound.rate(0.8 + Math.random() * 0.4);
        pegSound.play();
      }
      return;
    }
    
    const howl = this.sounds.get(sound);
    if (howl) {
      howl.play();
    }
  }
  
  public playWin(multiplier: number): void {
    if (!this.enabled || !this.initialized) return;
    
    if (multiplier >= 10) {
      this.play("bigWin");
    } else if (multiplier >= 2) {
      this.play("win");
    } else {
      this.play("land");
    }
  }
  
  public destroy(): void {
    this.sounds.forEach((sound) => {
      sound.unload();
    });
    this.sounds.clear();
    this.initialized = false;
  }
}

// Singleton instance
export const audioManager = new AudioManager();
