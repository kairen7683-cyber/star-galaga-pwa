(() => {
  'use strict';

  /* =========================================================================
   * 1. WEB AUDIO ARCADE SOUND ENGINE (100% Synthesized, Zero Network Lag)
   * ========================================================================= */
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.lastShotAt = 0;
    }

    unlock() {
      if (!this.enabled) return;
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    tone(f1, f2, dur, type = 'square', vol = 0.06, delay = 0) {
      if (!this.enabled || !this.ctx) return;
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f1, t0);
      if (f2 !== f1) osc.frequency.exponentialRampToValueAtTime(Math.max(24, f2), t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.01);
    }

    noise(dur = 0.2, vol = 0.11, cutoff = 1100) {
      if (!this.enabled || !this.ctx) return;
      const sr = this.ctx.sampleRate;
      const len = Math.floor(sr * dur);
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.3);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const flt = this.ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = cutoff;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      src.connect(flt);
      flt.connect(g);
      g.connect(this.ctx.destination);
      src.start();
    }

    vulcan(powerLv) {
      const now = performance.now();
      if (now - this.lastShotAt < 55) return;
      this.lastShotAt = now;
      this.tone(720 + powerLv * 55, 210, 0.048, 'triangle', 0.042);
    }

    laserBeam() {
      this.tone(1320, 440, 0.09, 'sawtooth', 0.04);
    }

    missileLaunch() {
      this.noise(0.09, 0.045, 2200);
    }

    hitMetal() {
      this.tone(440, 260, 0.04, 'square', 0.035);
    }

    explodeSmall() {
      this.noise(0.16, 0.09, 980);
      this.tone(240, 58, 0.14, 'sawtooth', 0.055);
    }

    explodeBig() {
      this.noise(0.46, 0.19, 760);
      this.tone(160, 36, 0.42, 'sawtooth', 0.1);
    }

    powerUp(isMax = false) {
      const notes = isMax ? [523, 659, 784, 1046, 1318] : [440, 554, 659, 880];
      notes.forEach((n, i) => this.tone(n, n * 1.02, 0.085, 'square', 0.065, i * 0.06));
    }

    medal() {
      this.tone(988, 1318, 0.075, 'sine', 0.06);
    }

    warningSiren() {
      for (let i = 0; i < 3; i++) {
        this.tone(420, 740, 0.24, 'sawtooth', 0.075, i * 0.34);
      }
    }

    airStrike() {
      this.noise(0.75, 0.22, 650);
      this.tone(130, 45, 0.68, 'sawtooth', 0.12);
    }
  }

  /* =========================================================================
   * 2. PRE-BAKED HD METALLIC SPRITE VAULT (60FPS on Galaxy A-Series Phones)
   *    Zero ctx.shadowBlur in game loop! All gradients & glows baked once.
   * ========================================================================= */
  function makeCanvas(w, h, drawFn) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cx = c.getContext('2d');
    drawFn(cx, w, h);
    return c;
  }

  function buildSprites() {
    const vault = { fighters: {}, enemies: {}, bullets: {}, items: {}, bg: {}, fx: [] };

    // --- Seamless Deep Ocean Tile (256x256) ---
    vault.bg.ocean = makeCanvas(256, 256, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#082038');
      g.addColorStop(0.5, '#0a2744');
      g.addColorStop(1, '#082038');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);

      // Subtle wave crests
      for (let i = 0; i < 64; i++) {
        const wx = (i * 47) % (w - 28);
        const wy = (i * 41) % h;
        c.fillStyle = i % 3 === 0 ? 'rgba(56, 189, 248, 0.09)' : 'rgba(14, 116, 144, 0.16)';
        c.beginPath();
        c.ellipse(wx + 14, wy, 12 + (i % 7), 2, 0, 0, Math.PI * 2);
        c.fill();
      }
    });

    // --- Tropical Atoll Island & Radar Base ---
    vault.bg.islandA = makeCanvas(180, 150, (c) => {
      // Shallow coral reef halo
      const reef = c.createRadialGradient(90, 75, 22, 90, 75, 82);
      reef.addColorStop(0, 'rgba(20, 184, 166, 0.42)');
      reef.addColorStop(0.65, 'rgba(6, 182, 212, 0.16)');
      reef.addColorStop(1, 'rgba(6, 182, 212, 0)');
      c.fillStyle = reef;
      c.beginPath();
      c.arc(90, 75, 82, 0, Math.PI * 2);
      c.fill();

      // Sand beach
      c.fillStyle = '#d6b87c';
      c.beginPath();
      c.ellipse(88, 76, 54, 40, -0.2, 0, Math.PI * 2);
      c.fill();

      // Jungle canopy
      const jg = c.createLinearGradient(45, 40, 130, 110);
      jg.addColorStop(0, '#1f6f43');
      jg.addColorStop(1, '#11422a');
      c.fillStyle = jg;
      c.beginPath();
      c.ellipse(86, 74, 44, 31, -0.2, 0, Math.PI * 2);
      c.fill();

      // Airfield runway strip on island
      c.save();
      c.translate(92, 76);
      c.rotate(-0.25);
      c.fillStyle = '#475569';
      c.fillRect(-26, -5, 52, 10);
      c.strokeStyle = '#e2e8f0';
      c.setLineDash([4, 4]);
      c.beginPath();
      c.moveTo(-22, 0);
      c.lineTo(22, 0);
      c.stroke();
      c.restore();
    });

    // --- Soft Volumetric Cloud ---
    vault.bg.cloud = makeCanvas(190, 120, (c) => {
      const puffs = [
        [65, 65, 42],
        [105, 56, 48],
        [135, 68, 36],
        [88, 74, 38]
      ];
      puffs.forEach(([x, y, r]) => {
        const g = c.createRadialGradient(x - 6, y - 8, 4, x, y, r);
        g.addColorStop(0, 'rgba(241, 245, 249, 0.24)');
        g.addColorStop(0.6, 'rgba(203, 213, 225, 0.11)');
        g.addColorStop(1, 'rgba(203, 213, 225, 0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      });
    });

    // --- Helper to bake 3 Evolution Tiers for each Fighter ---
    function bakeFighterTier(type, tier) {
      // tier: 1 (LV.1), 2 (LV.2-3), 3 (LV.4-5 Golden Ace)
      return makeCanvas(84, 84, (c, w, h) => {
        const cx = w / 2;
        const cy = h / 2 + 2;

        // Tier 3 Golden Ace Halo
        if (tier === 3) {
          const aura = c.createRadialGradient(cx, cy, 8, cx, cy, 38);
          aura.addColorStop(0, 'rgba(251, 191, 36, 0.28)');
          aura.addColorStop(1, 'rgba(251, 191, 36, 0)');
          c.fillStyle = aura;
          c.beginPath();
          c.arc(cx, cy, 38, 0, Math.PI * 2);
          c.fill();
        }

        const hullGrad = c.createLinearGradient(cx - 28, cy, cx + 28, cy);
        if (tier === 3) {
          hullGrad.addColorStop(0, '#b45309');
          hullGrad.addColorStop(0.3, '#fde68a');
          hullGrad.addColorStop(0.5, '#ffffff');
          hullGrad.addColorStop(0.7, '#fbbf24');
          hullGrad.addColorStop(1, '#92400e');
        } else if (type === 'lightning') {
          hullGrad.addColorStop(0, '#64748b');
          hullGrad.addColorStop(0.35, '#f1f5f9');
          hullGrad.addColorStop(0.5, '#ffffff');
          hullGrad.addColorStop(0.65, '#cbd5e1');
          hullGrad.addColorStop(1, '#475569');
        } else if (type === 'skyray') {
          hullGrad.addColorStop(0, '#1e3a8a');
          hullGrad.addColorStop(0.35, '#93c5fd');
          hullGrad.addColorStop(0.5, '#f8fafc');
          hullGrad.addColorStop(0.65, '#60a5fa');
          hullGrad.addColorStop(1, '#1e40af');
        } else {
          // shinden crimson-obsidian ace
          hullGrad.addColorStop(0, '#7f1d1d');
          hullGrad.addColorStop(0.35, '#f87171');
          hullGrad.addColorStop(0.5, '#fee2e2');
          hullGrad.addColorStop(0.65, '#ef4444');
          hullGrad.addColorStop(1, '#7f1d1d');
        }

        const accent = tier >= 2 ? '#f59e0b' : '#ef3349';

        if (type === 'lightning') {
          // P-38 Twin-Boom Metallic Fighter
          c.fillStyle = hullGrad;
          // Main swept wings
          c.beginPath();
          c.moveTo(cx, cy - 16);
          c.lineTo(cx + 34, cy + 4);
          c.lineTo(cx + 32, cy + 12);
          c.lineTo(cx, cy + 6);
          c.lineTo(cx - 32, cy + 12);
          c.lineTo(cx - 34, cy + 4);
          c.closePath();
          c.fill();
          c.strokeStyle = 'rgba(15, 23, 42, 0.65)';
          c.lineWidth = 1.2;
          c.stroke();

          // Wingtip crimson/gold stripes
          c.fillStyle = accent;
          c.fillRect(cx - 31, cy + 3, 9, 6);
          c.fillRect(cx + 22, cy + 3, 9, 6);

          // Tier 2+ Under-wing Missile Pods & Extra Barrels
          if (tier >= 2) {
            c.fillStyle = '#38bdf8';
            c.fillRect(cx - 23, cy - 10, 4, 12);
            c.fillRect(cx + 19, cy - 10, 4, 12);
          }
          if (tier === 3) {
            c.fillStyle = '#fbbf24';
            c.fillRect(cx - 6, cy - 34, 3, 10);
            c.fillRect(cx + 3, cy - 34, 3, 10);
          }

          // Twin booms & horizontal tailplane
          c.fillStyle = hullGrad;
          c.fillRect(cx - 14, cy - 18, 6, 44);
          c.fillRect(cx + 8, cy - 18, 6, 44);
          c.fillRect(cx - 16, cy + 21, 32, 6);

          // Central fuselage gondola
          c.beginPath();
          c.ellipse(cx, cy - 8, 7.5, 21, 0, 0, Math.PI * 2);
          c.fill();
          c.stroke();

          // Nose vulcan barrels
          c.fillStyle = '#e2e8f0';
          c.fillRect(cx - 2.5, cy - 33, 2, 7);
          c.fillRect(cx + 0.5, cy - 33, 2, 7);
        } else if (type === 'skyray') {
          // XF-5F Delta/Saucer Naval Interceptor
          c.fillStyle = hullGrad;
          c.beginPath();
          c.moveTo(cx, cy - 31);
          c.quadraticCurveTo(cx + 36, cy - 6, cx + 33, cy + 16);
          c.lineTo(cx + 10, cy + 24);
          c.lineTo(cx - 10, cy + 24);
          c.lineTo(cx - 33, cy + 16);
          c.quadraticCurveTo(cx - 36, cy - 6, cx, cy - 31);
          c.closePath();
          c.fill();
          c.strokeStyle = 'rgba(15, 23, 42, 0.7)';
          c.lineWidth = 1.3;
          c.stroke();

          // Glowing Plasma Channels on wings
          c.strokeStyle = tier === 3 ? '#fef08a' : '#22d3ee';
          c.lineWidth = tier >= 2 ? 2.6 : 1.6;
          c.beginPath();
          c.moveTo(cx - 16, cy - 14);
          c.lineTo(cx - 16, cy + 14);
          c.moveTo(cx + 16, cy - 14);
          c.lineTo(cx + 16, cy + 14);
          c.stroke();
        } else {
          // J7W Shinden Canard Pusher Fighter
          c.fillStyle = hullGrad;
          // Forward canards
          c.beginPath();
          c.moveTo(cx, cy - 26);
          c.lineTo(cx + 15, cy - 14);
          c.lineTo(cx - 15, cy - 14);
          c.closePath();
          c.fill();

          // Swept main rear wings
          c.beginPath();
          c.moveTo(cx, cy - 10);
          c.lineTo(cx + 34, cy + 18);
          c.lineTo(cx + 28, cy + 25);
          c.lineTo(cx, cy + 16);
          c.lineTo(cx - 28, cy + 25);
          c.lineTo(cx - 34, cy + 18);
          c.closePath();
          c.fill();
          c.strokeStyle = 'rgba(15, 23, 42, 0.7)';
          c.lineWidth = 1.2;
          c.stroke();

          // Fuselage spine
          c.fillStyle = tier === 3 ? '#fef3c7' : '#f8fafc';
          c.beginPath();
          c.ellipse(cx, cy - 2, 7, 27, 0, 0, Math.PI * 2);
          c.fill();

          if (tier >= 2) {
            c.fillStyle = '#fbbf24';
            c.fillRect(cx - 22, cy + 2, 5, 14);
            c.fillRect(cx + 17, cy + 2, 5, 14);
          }
        }

        // Glass Canopy Highlight (shared across fighters)
        const canopy = c.createLinearGradient(cx - 4, cy - 14, cx + 4, cy - 2);
        canopy.addColorStop(0, '#bae6fd');
        canopy.addColorStop(0.5, '#0284c7');
        canopy.addColorStop(1, '#0f172a');
        c.fillStyle = canopy;
        c.beginPath();
        c.ellipse(cx, cy - 7, 4.2, 9.5, 0, 0, Math.PI * 2);
        c.fill();
      });
    }

    ['lightning', 'skyray', 'shinden'].forEach((t) => {
      vault.fighters[t] = {
        1: bakeFighterTier(t, 1),
        2: bakeFighterTier(t, 2),
        3: bakeFighterTier(t, 3)
      };
    });

    // --- Autonomous Wingman Option Drone ---
    vault.fighters.drone = makeCanvas(32, 32, (c) => {
      c.fillStyle = '#fbbf24';
      c.beginPath();
      c.moveTo(16, 3);
      c.lineTo(28, 21);
      c.lineTo(16, 17);
      c.lineTo(4, 21);
      c.closePath();
      c.fill();
      c.fillStyle = '#38bdf8';
      c.beginPath();
      c.arc(16, 13, 3.5, 0, Math.PI * 2);
      c.fill();
    });

    // --- Allied B-29 Air-Strike Giant Bomber ---
    vault.fighters.bomber = makeCanvas(150, 120, (c) => {
      const g = c.createLinearGradient(25, 0, 125, 0);
      g.addColorStop(0, '#475569');
      g.addColorStop(0.5, '#f1f5f9');
      g.addColorStop(1, '#475569');
      c.fillStyle = g;
      // Wide heavy bomber wing
      c.fillRect(10, 44, 130, 20);
      // 4 engine nacelles
      [28, 52, 98, 122].forEach((ex) => {
        c.fillStyle = '#334155';
        c.fillRect(ex - 5, 34, 10, 26);
      });
      // Fuselage
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(75, 58, 10, 50, 0, 0, Math.PI * 2);
      c.fill();
      c.fillRect(54, 98, 42, 9);
      // Allied Star Roundel
      c.fillStyle = '#38bdf8';
      c.beginPath();
      c.arc(32, 54, 6, 0, Math.PI * 2);
      c.fill();
    });

    // --- Enemy Sprites ---
    const bakeScout = (mainCol, wingMark) =>
      makeCanvas(48, 48, (c) => {
        const g = c.createLinearGradient(8, 0, 40, 0);
        g.addColorStop(0, mainCol[0]);
        g.addColorStop(0.5, mainCol[1]);
        g.addColorStop(1, mainCol[0]);
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(24, 42);
        c.lineTo(44, 18);
        c.lineTo(42, 11);
        c.lineTo(24, 17);
        c.lineTo(6, 11);
        c.lineTo(4, 18);
        c.closePath();
        c.fill();
        c.fillRect(16, 5, 16, 5);
        c.beginPath();
        c.ellipse(24, 23, 5.5, 17, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = wingMark;
        c.beginPath();
        c.arc(13, 18, 3.2, 0, Math.PI * 2);
        c.arc(35, 18, 3.2, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#fde047';
        c.beginPath();
        c.ellipse(24, 26, 3, 5, 0, 0, Math.PI * 2);
        c.fill();
      });

    vault.enemies.scout = bakeScout(['#365314', '#84cc16'], '#ef4444');
    vault.enemies.supply = bakeScout(['#991b1b', '#f87171'], '#fef08a');

    // Medium Twin-Engine Gunship
    vault.enemies.gunship = makeCanvas(96, 82, (c) => {
      const g = c.createLinearGradient(12, 0, 84, 0);
      g.addColorStop(0, '#1e293b');
      g.addColorStop(0.5, '#94a3b8');
      g.addColorStop(1, '#1e293b');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(48, 72);
      c.lineTo(90, 32);
      c.lineTo(86, 20);
      c.lineTo(10, 20);
      c.lineTo(6, 32);
      c.closePath();
      c.fill();
      c.strokeStyle = '#0f172a';
      c.lineWidth = 1.5;
      c.stroke();

      // Twin engines
      c.fillStyle = '#475569';
      c.fillRect(22, 22, 12, 32);
      c.fillRect(62, 22, 12, 32);
      // Central heavy hull
      c.fillStyle = '#cbd5e1';
      c.beginPath();
      c.ellipse(48, 42, 11, 28, 0, 0, Math.PI * 2);
      c.fill();
      // Orange cockpit & turret core
      c.fillStyle = '#f97316';
      c.beginPath();
      c.arc(48, 50, 6, 0, Math.PI * 2);
      c.fill();
    });

    // Naval Battleship / Cruiser
    vault.enemies.battleship = makeCanvas(68, 136, (c) => {
      // White water wake
      c.strokeStyle = 'rgba(224, 242, 254, 0.35)';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(34, 130);
      c.lineTo(10, 16);
      c.moveTo(34, 130);
      c.lineTo(58, 16);
      c.stroke();

      // Armored deck hull
      const g = c.createLinearGradient(16, 0, 52, 0);
      g.addColorStop(0, '#334155');
      g.addColorStop(0.5, '#64748b');
      g.addColorStop(1, '#1e293b');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(34, 126);
      c.quadraticCurveTo(54, 92, 50, 22);
      c.lineTo(18, 22);
      c.quadraticCurveTo(14, 92, 34, 126);
      c.closePath();
      c.fill();

      // Bridge & Twin Turrets
      c.fillStyle = '#94a3b8';
      c.fillRect(24, 48, 20, 28);
      c.fillStyle = '#e2e8f0';
      c.beginPath();
      c.arc(34, 92, 7, 0, Math.PI * 2);
      c.arc(34, 36, 7, 0, Math.PI * 2);
      c.fill();
    });

    // Giant Flying Fortress Boss Hull
    vault.enemies.bossBody = makeCanvas(230, 136, (c) => {
      const g = c.createLinearGradient(15, 0, 215, 0);
      g.addColorStop(0, '#1e293b');
      g.addColorStop(0.25, '#64748b');
      g.addColorStop(0.5, '#cbd5e1');
      g.addColorStop(0.75, '#64748b');
      g.addColorStop(1, '#1e293b');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(115, 122);
      c.lineTo(222, 58);
      c.lineTo(214, 24);
      c.lineTo(152, 16);
      c.lineTo(78, 16);
      c.lineTo(16, 24);
      c.lineTo(8, 58);
      c.closePath();
      c.fill();
      c.strokeStyle = '#0f172a';
      c.lineWidth = 2;
      c.stroke();

      // Crimson armor trim
      c.fillStyle = '#dc2626';
      c.fillRect(36, 36, 158, 10);

      // Central Armored Command Core
      const coreG = c.createRadialGradient(115, 68, 4, 115, 68, 26);
      coreG.addColorStop(0, '#fef08a');
      coreG.addColorStop(0.45, '#ef4444');
      coreG.addColorStop(1, '#450a0a');
      c.fillStyle = coreG;
      c.beginPath();
      c.arc(115, 68, 24, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#fbbf24';
      c.lineWidth = 2.5;
      c.stroke();
    });

    vault.enemies.bossTurret = makeCanvas(44, 44, (c) => {
      c.fillStyle = '#334155';
      c.beginPath();
      c.arc(22, 22, 16, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#94a3b8';
      c.lineWidth = 2;
      c.stroke();
      c.fillStyle = '#fbbf24';
      c.fillRect(16, 24, 4, 16);
      c.fillRect(24, 24, 4, 16);
    });

    // --- Pre-Baked Glowing Projectiles ---
    vault.bullets.vulcan = makeCanvas(12, 26, (c) => {
      const g = c.createRadialGradient(6, 13, 1, 6, 13, 8);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.45, '#fde047');
      g.addColorStop(1, 'rgba(251, 191, 36, 0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 12, 26);
      c.fillStyle = '#ffffff';
      c.fillRect(4, 3, 4, 18);
    });

    vault.bullets.laser = makeCanvas(18, 48, (c) => {
      const g = c.createLinearGradient(0, 0, 18, 0);
      g.addColorStop(0, 'rgba(34, 211, 238, 0)');
      g.addColorStop(0.3, 'rgba(34, 211, 238, 0.85)');
      g.addColorStop(0.5, '#ffffff');
      g.addColorStop(0.7, 'rgba(34, 211, 238, 0.85)');
      g.addColorStop(1, 'rgba(34, 211, 238, 0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 18, 48);
    });

    vault.bullets.missile = makeCanvas(16, 28, (c) => {
      c.fillStyle = '#e2e8f0';
      c.fillRect(5, 4, 6, 16);
      c.fillStyle = '#38bdf8';
      c.beginPath();
      c.moveTo(8, 0);
      c.lineTo(12, 6);
      c.lineTo(4, 6);
      c.closePath();
      c.fill();
      c.fillStyle = '#fb923c';
      c.beginPath();
      c.arc(8, 22, 4, 0, Math.PI * 2);
      c.fill();
    });

    vault.bullets.rocket = makeCanvas(18, 30, (c) => {
      c.fillStyle = '#fca5a5';
      c.fillRect(5, 5, 8, 16);
      c.fillStyle = '#ef4444';
      c.beginPath();
      c.moveTo(9, 0);
      c.lineTo(14, 7);
      c.lineTo(4, 7);
      c.closePath();
      c.fill();
      c.fillStyle = '#fde047';
      c.beginPath();
      c.arc(9, 23, 5, 0, Math.PI * 2);
      c.fill();
    });

    const bakeEnemyOrb = (outerCol, midCol) =>
      makeCanvas(20, 20, (c) => {
        const g = c.createRadialGradient(10, 10, 1.5, 10, 10, 9.5);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.38, midCol);
        g.addColorStop(0.75, outerCol);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(10, 10, 9.5, 0, Math.PI * 2);
        c.fill();
      });

    vault.bullets.enemyRed = bakeEnemyOrb('rgba(239, 68, 68, 0.9)', '#fca5a5');
    vault.bullets.enemyAmber = bakeEnemyOrb('rgba(245, 158, 11, 0.9)', '#fde047');

    // --- Pre-Baked Items ([P], [B], [S], Gold Medal) ---
    const bakeBadgeItem = (letter, bgA, bgB, rim) =>
      makeCanvas(38, 38, (c) => {
        const glow = c.createRadialGradient(19, 19, 4, 19, 19, 19);
        glow.addColorStop(0, rim);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = glow;
        c.fillRect(0, 0, 38, 38);

        const g = c.createLinearGradient(6, 6, 32, 32);
        g.addColorStop(0, bgA);
        g.addColorStop(1, bgB);
        c.fillStyle = g;
        c.beginPath();
        if (typeof c.roundRect === 'function') {
          c.roundRect(6, 6, 26, 26, 6);
        } else {
          c.rect(6, 6, 26, 26);
        }
        c.fill();
        c.strokeStyle = '#ffffff';
        c.lineWidth = 2;
        c.stroke();

        c.fillStyle = '#ffffff';
        c.font = 'italic 700 16px Chakra Petch, sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(letter, 19, 20);
      });

    vault.items.P = bakeBadgeItem('P', '#f59e0b', '#b45309', 'rgba(251, 191, 36, 0.55)');
    vault.items.B = bakeBadgeItem('B', '#ef4444', '#991b1b', 'rgba(248, 113, 113, 0.55)');
    vault.items.S = bakeBadgeItem('S', '#06b6d4', '#0369a1', 'rgba(34, 211, 238, 0.55)');

    vault.items.medal = makeCanvas(28, 28, (c) => {
      const g = c.createLinearGradient(6, 4, 22, 24);
      g.addColorStop(0, '#fef08a');
      g.addColorStop(0.5, '#f59e0b');
      g.addColorStop(1, '#92400e');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(10, 4);
      c.lineTo(21, 4);
      c.lineTo(18, 24);
      c.lineTo(7, 24);
      c.closePath();
      c.fill();
      c.strokeStyle = '#fef9c3';
      c.lineWidth = 1.4;
      c.stroke();
    });

    // --- 8-Frame Pre-Baked Volumetric Explosion Sequence ---
    for (let f = 0; f < 8; f++) {
      const prog = f / 7;
      vault.fx.push(
        makeCanvas(96, 96, (c) => {
          const r = 12 + prog * 34;
          const alpha = Math.max(0, 1 - prog * 0.92);
          const g = c.createRadialGradient(48, 48, 2, 48, 48, r);
          g.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
          g.addColorStop(0.32, `rgba(253, 224, 71, ${alpha})`);
          g.addColorStop(0.65, `rgba(239, 68, 68, ${alpha * 0.85})`);
          g.addColorStop(1, 'rgba(30, 41, 59, 0)');
          c.fillStyle = g;
          c.beginPath();
          c.arc(48, 48, r, 0, Math.PI * 2);
          c.fill();
        })
      );
    }

    return vault;
  }

  /* =========================================================================
   * 3. DOM & HANGAR CONTROLLER + PWA INSTALLER
   * ========================================================================= */
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const viewportEl = document.getElementById('stage-viewport');

  const scoreEl = document.getElementById('score-display');
  const highScoreEl = document.getElementById('high-score-display');
  const livesRackEl = document.getElementById('lives-rack');
  const stageChipEl = document.getElementById('stage-chip');
  const powerTextEl = document.getElementById('power-level-text');
  const powerPipsEl = document.getElementById('power-pips');
  const bombCountEl = document.getElementById('bomb-count');
  const btnHyperBomb = document.getElementById('btn-hyper-bomb');
  const btnAutoFire = document.getElementById('btn-autofire');
  const btnSound = document.getElementById('btn-sound');
  const btnPause = document.getElementById('btn-pause');

  const bossHudEl = document.getElementById('boss-hud');
  const bossNameEl = document.getElementById('boss-name-label');
  const bossHpPctEl = document.getElementById('boss-hp-pct');
  const bossHpFillEl = document.getElementById('boss-hp-fill');

  const waveBannerEl = document.getElementById('wave-banner');
  const waveTitleEl = document.getElementById('wave-banner-title');
  const waveSubEl = document.getElementById('wave-banner-sub');

  const startScreenEl = document.getElementById('start-screen');
  const pauseScreenEl = document.getElementById('pause-screen');
  const gameoverScreenEl = document.getElementById('gameover-screen');
  const finalScoreEl = document.getElementById('final-score');
  const finalStageEl = document.getElementById('final-stage');
  const finalMedalsEl = document.getElementById('final-medals');
  const gameoverMsgEl = document.getElementById('gameover-record-msg');

  const btnStartGame = document.getElementById('btn-start-game');
  const btnResumeGame = document.getElementById('btn-resume-game');
  const btnRestartPause = document.getElementById('btn-restart-from-pause');
  const btnRetryGame = document.getElementById('btn-retry-game');
  const btnBackHangar = document.getElementById('btn-back-hangar');
  const btnInstallPwa = document.getElementById('btn-install-pwa');
  const iosGuideEl = document.getElementById('ios-install-guide');

  if ('serviceWorker' in navigator) {
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!reloaded && state.mode === 'title') {
        reloaded = true;
        window.location.reload();
      }
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => reg.update().catch(() => {}))
        .catch(() => {});
    });
  }

  let deferredPrompt = null;
  if (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  ) {
    btnInstallPwa.hidden = true;
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btnInstallPwa.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    btnInstallPwa.hidden = true;
  });
  btnInstallPwa.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice.catch(() => {});
      deferredPrompt = null;
    } else {
      iosGuideEl.hidden = !iosGuideEl.hidden;
      if (!/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        iosGuideEl.innerHTML =
          '💡 <strong>앱 설치:</strong> 크롬/삼성 인터넷 우측 상단 <strong>[⋮ 메뉴] → [앱 설치 / 홈 화면에 추가]</strong>를 누르면 바탕화면 아이콘으로 설치됩니다!';
      }
    }
  });

  /* =========================================================================
   * 4. GAME STATE & GALAXY A-SERIES ADAPTIVE VIEWPORT
   * ========================================================================= */
  const sound = new SoundEngine();
  const SPRITES = buildSprites();
  const HIGH_SCORE_KEY = 'strikers_1945_best_v2';

  let W = 390;
  let H = 660;
  let dpr = 1;

  const state = {
    mode: 'title', // 'title' | 'playing' | 'paused' | 'gameover'
    fighterType: 'lightning', // 'lightning' | 'skyray' | 'shinden'
    score: 0,
    highScore: Number(localStorage.getItem(HIGH_SCORE_KEY) || 0),
    medals: 0,
    stage: 1,
    stageProgress: 0,
    bossActive: false,
    lives: 3,
    bombs: 2,
    autoFire: true,
    nextLifeScore: 50000,
    oceanScroll: 0,
    screenShake: 0,
    flashAlpha: 0,
    waveTimer: 1.0,
    waveStep: 0,
    player: null,
    bullets: [],
    enemyBullets: [],
    enemies: [],
    boss: null,
    items: [],
    explosions: [],
    sparks: [],
    popups: [],
    airStrikeBombers: [],
    islands: [],
    clouds: []
  };

  highScoreEl.textContent = state.highScore.toLocaleString();

  // Draw Hangar Previews
  ['lightning', 'skyray', 'shinden'].forEach((type) => {
    const pCanvas = document.getElementById(`preview-${type}`);
    if (pCanvas) {
      const pCtx = pCanvas.getContext('2d');
      pCtx.drawImage(SPRITES.fighters[type][3], 0, 0, 64, 64);
    }
  });

  document.querySelectorAll('.fighter-card').forEach((card) => {
    card.addEventListener('click', () => {
      sound.unlock();
      sound.medal();
      document.querySelectorAll('.fighter-card').forEach((c) => {
        c.classList.remove('is-selected');
        c.setAttribute('aria-checked', 'false');
      });
      card.classList.add('is-selected');
      card.setAttribute('aria-checked', 'true');
      state.fighterType = card.dataset.fighter;
    });
  });

  function resizeCanvas() {
    const rect = viewportEl.getBoundingClientRect();
    W = Math.max(300, rect.width);
    H = Math.max(420, rect.height);
    // Cap DPR at 1.75 for crisp HD graphics + locked 60 FPS on Galaxy A-series GPUs
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    if (state.player) {
      state.player.x = Math.max(24, Math.min(W - 24, state.player.x));
      state.player.y = Math.max(54, Math.min(H - 36, state.player.y));
    }
  }
  window.addEventListener('resize', resizeCanvas);

  function seedScenery() {
    state.islands = [
      { x: W * 0.22, y: H * 0.2, scale: 1.0 },
      { x: W * 0.78, y: H * 0.72, scale: 0.82 }
    ];
    state.clouds = [
      { x: W * 0.18, y: H * 0.15, speed: 52, scale: 1.0 },
      { x: W * 0.75, y: H * 0.55, speed: 68, scale: 1.15 },
      { x: W * 0.42, y: H * 0.88, speed: 45, scale: 0.85 }
    ];
  }

  function createPlayer() {
    return {
      x: W / 2,
      y: H - 72,
      power: 1, // 1 to 5 (MAX)
      shield: false,
      invuln: 2.2,
      bank: 0, // -1 (left) to +1 (right)
      thrust: 0,
      mainCd: 0,
      subCd: 0,
      dronePhase: 0
    };
  }

  /* =========================================================================
   * 5. HUD, ITEMS, WEAPONS & UPGRADE EVOLUTION
   * ========================================================================= */
  function showBanner(title, sub, isWarning = false, ms = 2200) {
    waveTitleEl.textContent = title;
    waveSubEl.textContent = sub;
    waveBannerEl.classList.toggle('is-warning', isWarning);
    waveBannerEl.classList.add('is-visible');
    clearTimeout(showBanner._t);
    showBanner._t = setTimeout(() => waveBannerEl.classList.remove('is-visible'), ms);
  }

  function addScore(pts, x, y, label = null, color = '#fde047') {
    state.score += pts;
    if (state.score >= state.nextLifeScore) {
      state.lives = Math.min(5, state.lives + 1);
      state.nextLifeScore += 75000;
      if (state.player) addPopup(state.player.x, state.player.y - 28, '1UP EXTEND!', '#34d399');
      sound.powerUp(true);
      updateHud();
    }
    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem(HIGH_SCORE_KEY, String(state.highScore));
      highScoreEl.textContent = state.highScore.toLocaleString();
    }
    scoreEl.textContent = state.score.toLocaleString();
    if (x != null && y != null && label) {
      addPopup(x, y, label, color);
    }
  }

  function addPopup(x, y, text, color = '#fde047') {
    if (state.popups.length > 24) state.popups.shift();
    state.popups.push({ x, y, text, color, life: 0.85, maxLife: 0.85 });
  }

  function spawnExplosion(x, y, scale = 1.0, sparkCount = 10) {
    if (state.explosions.length < 28) {
      state.explosions.push({ x, y, scale, frame: 0, speed: 18 });
    }
    const maxSparks = state.sparks.length > 90 ? 4 : sparkCount;
    for (let i = 0; i < maxSparks; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 50 + Math.random() * 190 * scale;
      state.sparks.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color: i % 2 === 0 ? '#fde047' : '#fb7185',
        life: 0.25 + Math.random() * 0.25
      });
    }
  }

  function spawnItem(x, y, kind) {
    // 'P' bounces around screen like real Strikers 1945!
    const isBouncing = kind === 'P' || kind === 'B' || kind === 'S';
    const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.1;
    state.items.push({
      x,
      y,
      vx: isBouncing ? Math.cos(angle) * 95 : (Math.random() - 0.5) * 24,
      vy: isBouncing ? Math.sin(angle) * 95 : 88,
      kind, // 'P' | 'B' | 'S' | 'medal'
      bounces: isBouncing ? 4 : 0,
      spin: Math.random() * Math.PI * 2
    });
  }

  function collectItem(it) {
    const p = state.player;
    if (it.kind === 'P') {
      if (p.power < 5) {
        p.power++;
        const tierMsg =
          p.power === 2
            ? 'POW LV.2 // 보조무기 개방!'
            : p.power === 3
            ? 'POW LV.3 // 윙맨 드론 합류!'
            : p.power === 4
            ? 'POW LV.4 // 에이스 기체 진화!'
            : 'MAX OVERDRIVE!!';
        sound.powerUp(p.power === 5);
        addScore(500, p.x, p.y - 26, tierMsg, p.power === 5 ? '#fde047' : '#38bdf8');
      } else {
        sound.powerUp(true);
        addScore(2000, p.x, p.y - 26, 'MAX BONUS +2,000!', '#fde047');
      }
    } else if (it.kind === 'B') {
      state.bombs = Math.min(5, state.bombs + 1);
      sound.powerUp(false);
      addScore(500, p.x, p.y - 26, 'BOMB +1!', '#f87171');
    } else if (it.kind === 'S') {
      p.shield = true;
      sound.powerUp(false);
      addScore(500, p.x, p.y - 26, 'SHIELD ACTIVE!', '#22d3ee');
    } else {
      // Gold Medal: shinier spin phase awards up to 1,000 pts!
      state.medals++;
      const glint = Math.abs(Math.cos(it.spin)) > 0.82;
      const pts = glint ? 1000 : 300;
      sound.medal();
      addScore(pts, it.x, it.y - 10, glint ? 'SHINING +1,000!' : '+300', '#fde047');
    }
    updateHud();
  }

  function updateHud() {
    scoreEl.textContent = state.score.toLocaleString();
    highScoreEl.textContent = state.highScore.toLocaleString();
    stageChipEl.textContent = `MSN ${state.stage}`;

    // Lives
    livesRackEl.innerHTML = '';
    const extraLives = Math.max(0, state.lives - 1);
    for (let i = 0; i < extraLives; i++) {
      const span = document.createElement('span');
      span.className = 'life-wing';
      livesRackEl.appendChild(span);
    }

    // Power Gauge
    const lv = state.player ? state.player.power : 1;
    powerTextEl.textContent = lv >= 5 ? 'POW MAX!' : `POW LV.${lv}`;
    powerTextEl.classList.toggle('is-max', lv >= 5);

    const pips = powerPipsEl.children;
    for (let i = 0; i < pips.length; i++) {
      pips[i].className =
        i < lv ? (lv >= 5 ? 'power-pip is-max' : 'power-pip is-filled') : 'power-pip';
    }

    bombCountEl.textContent = `x${state.bombs}`;
    btnHyperBomb.disabled = state.bombs <= 0 || state.mode !== 'playing';
  }

  /* =========================================================================
   * 6. PLAYER WEAPON BARRAGE & ALLIED SQUADRON SUPER BOMB
   * ========================================================================= */
  function fireWeapons() {
    const p = state.player;
    if (!p) return;

    // 1. Primary Vulcan Stream (scales LV.1 -> LV.5)
    if (p.mainCd <= 0) {
      p.mainCd = p.power >= 5 ? 0.075 : 0.09;
      sound.vulcan(p.power);

      const speed = -760;
      const dmg = state.fighterType === 'skyray' ? 1.25 : 1.0;
      const addVulcan = (ox, oy, vx = 0) => {
        state.bullets.push({
          kind: 'vulcan',
          x: p.x + ox,
          y: p.y + oy,
          vx,
          vy: speed,
          dmg,
          pierce: false
        });
      };

      if (p.power === 1) {
        addVulcan(-7, -22);
        addVulcan(7, -22);
      } else if (p.power === 2) {
        addVulcan(0, -26);
        addVulcan(-12, -18, -32);
        addVulcan(12, -18, 32);
      } else if (p.power === 3) {
        addVulcan(-6, -26);
        addVulcan(6, -26);
        addVulcan(-16, -16, -55);
        addVulcan(16, -16, 55);
      } else if (p.power === 4) {
        addVulcan(0, -28);
        addVulcan(-10, -24, -22);
        addVulcan(10, -24, 22);
        addVulcan(-20, -16, -78);
        addVulcan(20, -16, 78);
      } else {
        // LV.5 MAX OVERDRIVE 6-stream heavy vulcan
        addVulcan(-5, -30);
        addVulcan(5, -30);
        addVulcan(-14, -24, -38);
        addVulcan(14, -24, 38);
        addVulcan(-24, -16, -98);
        addVulcan(24, -16, 98);
      }

      // Autonomous Wingman Option Drones fire too!
      const drones = getDronePositions(p);
      drones.forEach((d) => {
        state.bullets.push({
          kind: 'vulcan',
          x: d.x,
          y: d.y - 12,
          vx: 0,
          vy: -740,
          dmg: 0.85,
          pierce: false
        });
      });
    }

    // 2. Sub-Weapon System (LV.2+ : Homing Missiles / Piercing Laser / Napalm Rockets)
    if (p.power >= 2 && p.subCd <= 0) {
      const count = p.power >= 5 ? 4 : p.power >= 4 ? 2 : 2;
      if (state.fighterType === 'lightning') {
        p.subCd = p.power >= 5 ? 0.34 : 0.46;
        sound.missileLaunch();
        const offsets = count === 4 ? [-26, -14, 14, 26] : [-18, 18];
        offsets.forEach((ox) => {
          state.bullets.push({
            kind: 'missile',
            x: p.x + ox,
            y: p.y - 6,
            vx: ox * 2.4,
            vy: -220,
            dmg: 2.4,
            smokeTick: 0
          });
        });
      } else if (state.fighterType === 'skyray') {
        p.subCd = p.power >= 5 ? 0.24 : 0.32;
        sound.laserBeam();
        const offsets = p.power >= 4 ? [-18, 18] : [0];
        offsets.forEach((ox) => {
          state.bullets.push({
            kind: 'laser',
            x: p.x + ox,
            y: p.y - 28,
            vx: 0,
            vy: -920,
            dmg: p.power >= 5 ? 2.6 : 1.9,
            pierce: true,
            hitSet: new Set()
          });
        });
      } else {
        // J7W Shinden Napalm Rockets (Explosive splash AoE on impact!)
        p.subCd = p.power >= 5 ? 0.3 : 0.42;
        sound.missileLaunch();
        const offsets = count === 4 ? [-24, -11, 11, 24] : [-16, 16];
        offsets.forEach((ox) => {
          state.bullets.push({
            kind: 'rocket',
            x: p.x + ox,
            y: p.y - 10,
            vx: ox * 0.6,
            vy: -560,
            dmg: 3.1,
            aoe: true
          });
        });
      }
    }
  }

  function getDronePositions(p) {
    if (p.power < 3) return [];
    const bob = Math.sin(p.dronePhase * 4) * 4;
    if (p.power === 3) {
      return [{ x: p.x - 36, y: p.y + 8 + bob }];
    }
    return [
      { x: p.x - 38, y: p.y + 8 + bob },
      { x: p.x + 38, y: p.y + 8 - bob }
    ];
  }

  function triggerAirStrikeBomb() {
    if (state.mode !== 'playing' || state.bombs <= 0 || !state.player) return;
    state.bombs--;
    state.player.invuln = Math.max(state.player.invuln, 2.8);
    state.screenShake = 0.55;
    state.flashAlpha = 0.55;
    sound.airStrike();
    showBanner('TACTICAL AIR STRIKE!', '아군 대형 폭격기 편대 지원 폭격!', false, 1500);

    // Convert all enemy bullets on screen into bonus points!
    if (state.enemyBullets.length > 0) {
      const cleared = state.enemyBullets.length;
      state.enemyBullets.forEach((eb) => {
        spawnExplosion(eb.x, eb.y, 0.35, 2);
      });
      state.enemyBullets = [];
      addScore(cleared * 50, state.player.x, state.player.y - 32, `BULLET CANCEL +${cleared * 50}!`, '#38bdf8');
    }

    // Spawn 3 giant B-29 bombers roaring upward
    state.airStrikeBombers.push(
      { x: W * 0.5, y: H + 80, vy: -390, dropTick: 0 },
      { x: W * 0.2, y: H + 150, vy: -390, dropTick: 0.08 },
      { x: W * 0.8, y: H + 150, vy: -390, dropTick: 0.08 }
    );
    updateHud();
  }

  /* =========================================================================
   * 7. ENEMY SQUADRONS & GIANT MULTI-PART STAGE BOSSES
   * ========================================================================= */
  function spawnEnemyWave() {
    if (state.bossActive) return;

    state.waveStep++;
    const s = state.stage;
    const hpScale = 1 + (s - 1) * 0.28;

    // Spawn Stage Boss after 9 waves!
    if (state.waveStep >= 10) {
      spawnStageBoss();
      return;
    }

    const pattern = state.waveStep % 5;
    if (pattern === 1) {
      // V-Formation Scout Squadron
      const cx = 70 + Math.random() * (W - 140);
      for (let i = -2; i <= 2; i++) {
        state.enemies.push({
          kind: 'scout',
          x: cx + i * 36,
          y: -30 - Math.abs(i) * 26,
          vx: 0,
          vy: 145 + s * 10,
          hp: 2 * hpScale,
          maxHp: 2 * hpScale,
          shootCd: 0.8 + Math.random() * 0.8,
          score: 150
        });
      }
    } else if (pattern === 2) {
      // Red Supply Squadron (Drops [P] Power-Up!)
      const fromLeft = Math.random() < 0.5;
      for (let i = 0; i < 4; i++) {
        state.enemies.push({
          kind: 'supply',
          x: fromLeft ? 45 + i * 36 : W - 45 - i * 36,
          y: -30 - i * 34,
          vx: fromLeft ? 38 : -38,
          vy: 130,
          hp: 2.5 * hpScale,
          maxHp: 2.5 * hpScale,
          shootCd: 1.1,
          dropsPower: i === 2,
          score: 250
        });
      }
    } else if (pattern === 3) {
      // Heavy Twin-Engine Gunship + Escorts
      const gx = W * (0.28 + Math.random() * 0.44);
      state.enemies.push({
        kind: 'gunship',
        x: gx,
        y: -55,
        vx: 0,
        vy: 68,
        hp: 22 * hpScale,
        maxHp: 22 * hpScale,
        shootCd: 1.0,
        dropsPower: true,
        score: 1200
      });
      [-58, 58].forEach((ox) => {
        state.enemies.push({
          kind: 'scout',
          x: Math.max(28, Math.min(W - 28, gx + ox)),
          y: -30,
          vx: 0,
          vy: 120,
          hp: 2 * hpScale,
          maxHp: 2 * hpScale,
          shootCd: 0.9,
          score: 150
        });
      });
    } else if (pattern === 4) {
      // Naval Battleship sailing on sea + Sweeping Scouts
      state.enemies.push({
        kind: 'battleship',
        x: 65 + Math.random() * (W - 130),
        y: -80,
        vx: 0,
        vy: 46,
        hp: 28 * hpScale,
        maxHp: 28 * hpScale,
        shootCd: 1.2,
        ground: true,
        score: 1600
      });
      for (let i = 0; i < 4; i++) {
        state.enemies.push({
          kind: 'scout',
          x: i % 2 === 0 ? 40 : W - 40,
          y: -25 - i * 42,
          vx: i % 2 === 0 ? 55 : -55,
          vy: 155,
          hp: 2 * hpScale,
          maxHp: 2 * hpScale,
          shootCd: 0.75,
          score: 150
        });
      }
    } else {
      // Dual Heavy Gunships!
      [W * 0.28, W * 0.72].forEach((gx, idx) => {
        state.enemies.push({
          kind: 'gunship',
          x: gx,
          y: -60 - idx * 35,
          vx: 0,
          vy: 64,
          hp: 20 * hpScale,
          maxHp: 20 * hpScale,
          shootCd: 1.1,
          dropsSpecial: idx === 1,
          score: 1200
        });
      });
    }
  }

  function spawnStageBoss() {
    state.bossActive = true;
    sound.warningSiren();
    const bossNames = ['XB-0 IRON VALKYRIE', 'YAMATO-X SKY DREADNOUGHT', 'GIGA LEVIATHAN'];
    const bName = bossNames[(state.stage - 1) % bossNames.length];
    showBanner('🚨 WARNING 🚨', `거대 결전 병기 [${bName}] 접근 중!`, true, 2600);

    const coreHp = 190 + (state.stage - 1) * 95;
    const turretHp = 55 + (state.stage - 1) * 28;

    state.boss = {
      name: bName,
      x: W / 2,
      y: -90,
      targetY: 112,
      vx: 62,
      hp: coreHp,
      maxHp: coreHp,
      leftTurretHp: turretHp,
      rightTurretHp: turretHp,
      phase2: false,
      patternTimer: 1.4,
      patternStep: 0
    };

    bossNameEl.textContent = `WARNING // ${bName}`;
    bossHpPctEl.textContent = '100%';
    bossHpFillEl.style.width = '100%';
    bossHudEl.classList.add('is-active');
  }

  function damageEnemy(en, dmg) {
    en.hp -= dmg;
    en.hitFlash = 0.06;
    if (en.hp <= 0 && !en.dead) {
      en.dead = true;
      const isHeavy = en.kind === 'gunship' || en.kind === 'battleship';
      spawnExplosion(en.x, en.y, isHeavy ? 1.35 : 0.82, isHeavy ? 16 : 8);
      if (isHeavy) {
        sound.explodeBig();
        state.screenShake = Math.max(state.screenShake, 0.16);
        spawnItem(en.x - 12, en.y, 'medal');
        spawnItem(en.x + 12, en.y + 8, 'medal');
      } else {
        sound.explodeSmall();
        if (Math.random() < 0.28) spawnItem(en.x, en.y, 'medal');
      }

      if (en.dropsPower) {
        spawnItem(en.x, en.y, 'P');
      } else if (en.dropsSpecial) {
        spawnItem(en.x, en.y, Math.random() < 0.55 ? 'S' : 'B');
      }
      addScore(en.score, en.x, en.y);
    }
  }

  function damageBoss(dmg, hitX, hitY) {
    const b = state.boss;
    if (!b) return;

    // Check Left / Right Wing Turret hitboxes first!
    if (b.leftTurretHp > 0 && Math.abs(hitX - (b.x - 68)) < 28 && Math.abs(hitY - (b.y + 12)) < 28) {
      b.leftTurretHp -= dmg;
      if (b.leftTurretHp <= 0) {
        spawnExplosion(b.x - 68, b.y + 12, 1.5, 18);
        sound.explodeBig();
        spawnItem(b.x - 68, b.y + 12, 'medal');
        spawnItem(b.x - 54, b.y + 18, 'P');
        addScore(1500, b.x - 68, b.y, 'LEFT TURRET DESTROYED!', '#38bdf8');
      }
      return;
    }

    if (b.rightTurretHp > 0 && Math.abs(hitX - (b.x + 68)) < 28 && Math.abs(hitY - (b.y + 12)) < 28) {
      b.rightTurretHp -= dmg;
      if (b.rightTurretHp <= 0) {
        spawnExplosion(b.x + 68, b.y + 12, 1.5, 18);
        sound.explodeBig();
        spawnItem(b.x + 68, b.y + 12, 'medal');
        spawnItem(b.x + 54, b.y + 18, 'S');
        addScore(1500, b.x + 68, b.y, 'RIGHT TURRET DESTROYED!', '#38bdf8');
      }
      return;
    }

    b.hp -= dmg;
    const pct = Math.max(0, Math.ceil((b.hp / b.maxHp) * 100));
    bossHpPctEl.textContent = `${pct}%`;
    bossHpFillEl.style.width = `${pct}%`;

    if (!b.phase2 && b.hp <= b.maxHp * 0.45) {
      b.phase2 = true;
      spawnExplosion(b.x, b.y, 1.8, 22);
      sound.explodeBig();
      showBanner('CORE OVERLOAD!', '보스 2페이즈 코어 개방 — 탄막 주의!', true, 1600);
    }

    if (b.hp <= 0) {
      // Boss Defeated!
      const bx = b.x;
      const by = b.y;
      state.boss = null;
      state.bossActive = false;
      bossHudEl.classList.remove('is-active');
      state.enemyBullets = [];
      state.screenShake = 0.65;
      state.flashAlpha = 0.6;
      sound.explodeBig();

      for (let k = 0; k < 6; k++) {
        setTimeout(() => {
          spawnExplosion(bx + (Math.random() - 0.5) * 140, by + (Math.random() - 0.5) * 60, 1.6, 14);
          sound.explodeSmall();
        }, k * 120);
      }

      for (let m = 0; m < 5; m++) {
        spawnItem(bx + (m - 2) * 24, by, 'medal');
      }
      spawnItem(bx, by + 16, 'B');
      addScore(10000 * state.stage, bx, by, `MISSION ${state.stage} CLEAR! +${(10000 * state.stage).toLocaleString()}`, '#fde047');

      state.stage++;
      state.waveStep = 0;
      state.waveTimer = 3.2;
      updateHud();
      setTimeout(() => {
        if (state.mode === 'playing') {
          showBanner(`MISSION ${state.stage}`, '새로운 적 주력 함대 해역 진입!', false, 2200);
        }
      }, 1700);
    }
  }

  function hitPlayer() {
    const p = state.player;
    if (!p || p.invuln > 0) return;

    if (p.shield) {
      p.shield = false;
      p.invuln = 1.8;
      spawnExplosion(p.x, p.y, 1.1, 14);
      sound.explodeSmall();
      addPopup(p.x, p.y - 24, 'SHIELD GUARD!', '#22d3ee');
      updateHud();
      return;
    }

    state.lives--;
    state.screenShake = 0.45;
    state.flashAlpha = 0.35;
    spawnExplosion(p.x, p.y, 1.8, 26);
    sound.explodeBig();

    if (state.lives <= 0) {
      state.mode = 'gameover';
      bossHudEl.classList.remove('is-active');
      updateHud();
      finalScoreEl.textContent = state.score.toLocaleString();
      finalStageEl.textContent = String(state.stage);
      finalMedalsEl.textContent = String(state.medals);
      gameoverMsgEl.textContent =
        state.score >= state.highScore && state.score > 0
          ? '🏆 최고 기록 경신! 전설적인 1945 스카이 에이스입니다!'
          : '멋진 출격이었습니다! 기체를 바꿔 다시 도전해 보세요!';
      setTimeout(() => {
        if (state.mode === 'gameover') gameoverScreenEl.hidden = false;
      }, 700);
    } else {
      // Drop a recovery [P] item and keep (power - 1) so player stays strong!
      if (p.power > 1) {
        p.power = Math.max(1, p.power - 1);
        spawnItem(W / 2, H * 0.42, 'P');
      }
      p.x = W / 2;
      p.y = H - 72;
      p.invuln = 2.8;
      updateHud();
    }
  }

  /* =========================================================================
   * 8. INPUT HANDLERS (Full 360° Touch Slide + 8-Way Keyboard)
   * ========================================================================= */
  const keys = { left: false, right: false, up: false, down: false, shoot: false };
  const pointer = { active: false, id: null, lastX: 0, lastY: 0 };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keys.left = true; if (state.mode === 'playing') e.preventDefault(); }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { keys.right = true; if (state.mode === 'playing') e.preventDefault(); }
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { keys.up = true; if (state.mode === 'playing') e.preventDefault(); }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { keys.down = true; if (state.mode === 'playing') e.preventDefault(); }
    if (e.code === 'Space') { keys.shoot = true; if (state.mode === 'playing') e.preventDefault(); }
    if ((e.code === 'KeyB' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') && state.mode === 'playing') {
      triggerAirStrikeBomb();
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (state.mode === 'playing') pauseGame();
      else if (state.mode === 'paused') resumeGame();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
    if (e.code === 'Space') keys.shoot = false;
  });

  canvas.addEventListener('pointerdown', (e) => {
    sound.unlock();
    if (state.mode !== 'playing') return;
    canvas.setPointerCapture(e.pointerId);
    pointer.active = true;
    pointer.id = e.pointerId;
    pointer.lastX = e.clientX;
    pointer.lastY = e.clientY;
    if (!state.autoFire) fireWeapons();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointer.active || e.pointerId !== pointer.id || state.mode !== 'playing') return;
    const sensitivity = state.fighterType === 'shinden' ? 1.38 : 1.25;
    const dx = (e.clientX - pointer.lastX) * sensitivity;
    const dy = (e.clientY - pointer.lastY) * sensitivity;
    pointer.lastX = e.clientX;
    pointer.lastY = e.clientY;

    const p = state.player;
    if (p) {
      p.x = Math.max(24, Math.min(W - 24, p.x + dx));
      p.y = Math.max(54, Math.min(H - 36, p.y + dy));
      p.bank = Math.max(-1, Math.min(1, dx * 0.14));
      p.thrust = dy < -0.5 ? 1 : dy > 0.5 ? -1 : 0;
    }
  });

  function stopPointer(e) {
    if (e.pointerId === pointer.id) {
      pointer.active = false;
      pointer.id = null;
    }
  }
  canvas.addEventListener('pointerup', stopPointer);
  canvas.addEventListener('pointercancel', stopPointer);

  btnAutoFire.addEventListener('click', () => {
    sound.unlock();
    state.autoFire = !state.autoFire;
    btnAutoFire.setAttribute('aria-pressed', String(state.autoFire));
  });

  btnSound.addEventListener('click', () => {
    sound.enabled = !sound.enabled;
    if (sound.enabled) sound.unlock();
    btnSound.setAttribute('aria-pressed', String(sound.enabled));
    btnSound.textContent = sound.enabled ? '🔊' : '🔇';
  });

  btnPause.addEventListener('click', () => {
    if (state.mode === 'playing') pauseGame();
    else if (state.mode === 'paused') resumeGame();
  });

  btnHyperBomb.addEventListener('click', () => {
    sound.unlock();
    triggerAirStrikeBomb();
  });

  function startNewGame() {
    resizeCanvas();
    state.score = 0;
    state.medals = 0;
    state.stage = 1;
    state.waveStep = 0;
    state.waveTimer = 1.1;
    state.bossActive = false;
    state.boss = null;
    state.lives = 3;
    state.bombs = 2;
    state.nextLifeScore = 50000;
    state.bullets = [];
    state.enemyBullets = [];
    state.enemies = [];
    state.items = [];
    state.explosions = [];
    state.sparks = [];
    state.popups = [];
    state.airStrikeBombers = [];
    state.player = createPlayer();
    state.mode = 'playing';

    bossHudEl.classList.remove('is-active');
    startScreenEl.hidden = true;
    pauseScreenEl.hidden = true;
    gameoverScreenEl.hidden = true;

    updateHud();
    showBanner('MISSION 1', '남태평양 해상 전선 돌파 — 아이템 [P]로 기체를 진화시키세요!');
  }

  function openHangar() {
    state.mode = 'title';
    bossHudEl.classList.remove('is-active');
    pauseScreenEl.hidden = true;
    gameoverScreenEl.hidden = true;
    startScreenEl.hidden = false;
    updateHud();
  }

  function pauseGame() {
    if (state.mode !== 'playing') return;
    state.mode = 'paused';
    pauseScreenEl.hidden = false;
    updateHud();
  }

  function resumeGame() {
    if (state.mode !== 'paused') return;
    state.mode = 'playing';
    pauseScreenEl.hidden = true;
    lastTime = performance.now();
    updateHud();
  }

  btnStartGame.addEventListener('click', () => { sound.unlock(); startNewGame(); });
  btnRetryGame.addEventListener('click', () => { sound.unlock(); startNewGame(); });
  btnBackHangar.addEventListener('click', () => openHangar());
  btnRestartPause.addEventListener('click', () => openHangar());
  btnResumeGame.addEventListener('click', () => resumeGame());

  /* =========================================================================
   * 9. MAIN UPDATE LOOP
   * ========================================================================= */
  function findNearestTarget(x, y) {
    let best = null;
    let bestDist = Infinity;
    for (let i = 0; i < state.enemies.length; i++) {
      const en = state.enemies[i];
      const d = Math.hypot(en.x - x, en.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = en;
      }
    }
    if (state.boss) {
      const bd = Math.hypot(state.boss.x - x, state.boss.y - y);
      if (bd < bestDist) best = state.boss;
    }
    return best;
  }

  function update(dt) {
    // Scroll Ocean, Islands & Clouds continuously
    state.oceanScroll = (state.oceanScroll + 92 * dt) % 256;
    state.islands.forEach((isl) => {
      isl.y += 42 * dt;
      if (isl.y > H + 110) {
        isl.y = -120;
        isl.x = 50 + Math.random() * (W - 100);
        isl.scale = 0.75 + Math.random() * 0.45;
      }
    });
    state.clouds.forEach((cl) => {
      cl.y += cl.speed * dt;
      if (cl.y > H + 90) {
        cl.y = -90;
        cl.x = Math.random() * W;
      }
    });

    if (state.mode !== 'playing') return;

    if (state.screenShake > 0) state.screenShake = Math.max(0, state.screenShake - dt);
    if (state.flashAlpha > 0) state.flashAlpha = Math.max(0, state.flashAlpha - dt * 1.8);

    const p = state.player;
    if (p) {
      p.dronePhase += dt;
      if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);
      if (p.mainCd > 0) p.mainCd -= dt;
      if (p.subCd > 0) p.subCd -= dt;

      const mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      const my = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      if (mx !== 0 || my !== 0) {
        const len = Math.hypot(mx, my) || 1;
        const baseSpd = state.fighterType === 'shinden' ? 360 : 315;
        p.x = Math.max(24, Math.min(W - 24, p.x + (mx / len) * baseSpd * dt));
        p.y = Math.max(54, Math.min(H - 36, p.y + (my / len) * baseSpd * dt));
        p.bank += (mx - p.bank) * Math.min(1, 12 * dt);
        p.thrust = my < 0 ? 1 : my > 0 ? -1 : 0;
      } else if (!pointer.active) {
        p.bank += (0 - p.bank) * Math.min(1, 10 * dt);
        p.thrust = 0;
      }

      if (state.autoFire || keys.shoot) {
        fireWeapons();
      }
    }

    // Allied B-29 Air-Strike Bombers
    for (let i = state.airStrikeBombers.length - 1; i >= 0; i--) {
      const bm = state.airStrikeBombers[i];
      bm.y += bm.vy * dt;
      bm.dropTick -= dt;
      if (bm.dropTick <= 0 && bm.y > 0 && bm.y < H) {
        bm.dropTick = 0.09;
        spawnExplosion(bm.x + (Math.random() - 0.5) * 90, bm.y - 40, 1.2, 4);
        state.enemyBullets = [];
        // Damage nearby enemies & boss
        state.enemies.forEach((en) => damageEnemy(en, 4.5));
        if (state.boss) damageBoss(5.5, state.boss.x, state.boss.y);
      }
      if (bm.y < -130) state.airStrikeBombers.splice(i, 1);
    }

    // Wave Spawner
    if (!state.bossActive) {
      state.waveTimer -= dt;
      if (state.waveTimer <= 0) {
        spawnEnemyWave();
        state.waveTimer = Math.max(1.85, 2.75 - state.stage * 0.12);
      }
    }

    // Player Projectiles (Vulcan, Homing Missiles, Piercing Lasers, Napalm Rockets)
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];

      if (b.kind === 'missile') {
        const target = findNearestTarget(b.x, b.y);
        if (target) {
          const desired = Math.atan2(target.y - b.y, target.x - b.x);
          const cur = Math.atan2(b.vy, b.vx);
          let diff = desired - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const nextAng = cur + Math.max(-5.5 * dt, Math.min(5.5 * dt, diff));
          const spd = 480;
          b.vx = Math.cos(nextAng) * spd;
          b.vy = Math.sin(nextAng) * spd;
        } else {
          b.vy = Math.max(-520, b.vy - 600 * dt);
        }
        b.smokeTick -= dt;
        if (b.smokeTick <= 0 && state.sparks.length < 75) {
          b.smokeTick = 0.035;
          state.sparks.push({ x: b.x, y: b.y + 8, vx: 0, vy: 30, color: 'rgba(226,232,240,0.55)', life: 0.18 });
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.y < -50 || b.y > H + 40 || b.x < -40 || b.x > W + 40) {
        state.bullets.splice(i, 1);
        continue;
      }

      let consumed = false;

      // Hit Enemies
      for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
        const en = state.enemies[ei];
        const hitR = en.kind === 'gunship' ? 36 : en.kind === 'battleship' ? 28 : 21;
        if (Math.abs(b.x - en.x) < hitR && Math.abs(b.y - en.y) < hitR) {
          if (b.pierce) {
            if (b.hitSet.has(en)) continue;
            b.hitSet.add(en);
          }
          if (b.aoe) {
            spawnExplosion(b.x, b.y, 1.05, 8);
            state.enemies.forEach((other) => {
              if (Math.hypot(other.x - b.x, other.y - b.y) < 64) damageEnemy(other, b.dmg * 0.65);
            });
          }
          damageEnemy(en, b.dmg);
          if (!b.pierce) {
            consumed = true;
            break;
          }
        }
      }

      // Hit Boss
      if (!consumed && state.boss) {
        const bs = state.boss;
        if (Math.abs(b.x - bs.x) < 98 && Math.abs(b.y - bs.y) < 46) {
          if (!b.pierce || !b.hitSet.has(bs)) {
            if (b.pierce) b.hitSet.add(bs);
            if (b.aoe) spawnExplosion(b.x, b.y, 0.95, 6);
            damageBoss(b.dmg, b.x, b.y);
            if (!b.pierce) consumed = true;
          }
        }
      }

      if (consumed) {
        state.bullets.splice(i, 1);
      }
    }

    // Update Enemies
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const en = state.enemies[i];
      if (en.dead) {
        state.enemies.splice(i, 1);
        continue;
      }
      if (en.hitFlash > 0) en.hitFlash -= dt;

      en.x += en.vx * dt;
      en.y += en.vy * dt;
      if ((en.x < 26 && en.vx < 0) || (en.x > W - 26 && en.vx > 0)) en.vx *= -1;

      if (en.y > H + 90) {
        state.enemies.splice(i, 1);
        continue;
      }

      // Enemy Fire
      en.shootCd -= dt;
      if (en.shootCd <= 0 && en.y > 24 && en.y < H - 140 && p) {
        const aim = Math.atan2(p.y - en.y, p.x - en.x);
        const spd = 195 + Math.min(95, state.stage * 14);
        if (en.kind === 'gunship') {
          en.shootCd = 1.65;
          [-0.22, 0, 0.22].forEach((off) => {
            state.enemyBullets.push({
              x: en.x,
              y: en.y + 22,
              vx: Math.cos(aim + off) * spd,
              vy: Math.sin(aim + off) * spd,
              amber: true
            });
          });
        } else if (en.kind === 'battleship') {
          en.shootCd = 1.85;
          [-0.16, 0.16].forEach((off) => {
            state.enemyBullets.push({
              x: en.x,
              y: en.y + 10,
              vx: Math.cos(aim + off) * spd,
              vy: Math.sin(aim + off) * spd,
              amber: false
            });
          });
        } else {
          en.shootCd = 1.9 + Math.random();
          state.enemyBullets.push({
            x: en.x,
            y: en.y + 14,
            vx: Math.cos(aim) * spd,
            vy: Math.sin(aim) * spd,
            amber: false
          });
        }
      }

      // Air-to-Air Collision (Ground battleships don't collide with aircraft!)
      if (!en.ground && p && p.invuln <= 0) {
        if (Math.abs(en.x - p.x) < 24 && Math.abs(en.y - p.y) < 24) {
          damageEnemy(en, 10);
          hitPlayer();
        }
      }
    }

    // Update Giant Boss
    if (state.boss) {
      const bs = state.boss;
      if (bs.y < bs.targetY) {
        bs.y += 75 * dt;
      } else {
        bs.x += bs.vx * dt;
        if (bs.x < 95 || bs.x > W - 95) bs.vx *= -1;
      }

      bs.patternTimer -= dt;
      if (bs.patternTimer <= 0 && p) {
        bs.patternStep++;
        const spd = bs.phase2 ? 235 : 195;

        // Left & Right Turret Aimed Shots
        if (bs.leftTurretHp > 0) {
          const aL = Math.atan2(p.y - (bs.y + 16), p.x - (bs.x - 68));
          state.enemyBullets.push({ x: bs.x - 68, y: bs.y + 22, vx: Math.cos(aL) * spd, vy: Math.sin(aL) * spd, amber: true });
        }
        if (bs.rightTurretHp > 0) {
          const aR = Math.atan2(p.y - (bs.y + 16), p.x - (bs.x + 68));
          state.enemyBullets.push({ x: bs.x + 68, y: bs.y + 22, vx: Math.cos(aR) * spd, vy: Math.sin(aR) * spd, amber: true });
        }

        // Core Fan / Radial Barrage
        const fanCount = bs.phase2 ? 9 : 5;
        const spread = bs.phase2 ? 1.35 : 0.9;
        const baseA = Math.atan2(p.y - bs.y, p.x - bs.x);
        for (let k = 0; k < fanCount; k++) {
          const ang = baseA - spread / 2 + (spread * k) / (fanCount - 1);
          state.enemyBullets.push({
            x: bs.x,
            y: bs.y + 24,
            vx: Math.cos(ang) * (spd * 0.92),
            vy: Math.sin(ang) * (spd * 0.92),
            amber: k % 2 === 0
          });
        }
        bs.patternTimer = bs.phase2 ? 1.05 : 1.45;
      }

      if (p && p.invuln <= 0 && Math.abs(p.x - bs.x) < 76 && Math.abs(p.y - bs.y) < 34) {
        hitPlayer();
      }
    }

    // Enemy Bullets
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
      const eb = state.enemyBullets[i];
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;
      if (eb.x < -20 || eb.x > W + 20 || eb.y < -20 || eb.y > H + 20) {
        state.enemyBullets.splice(i, 1);
        continue;
      }
      // Fair 1945 arcade cockpit graze hitbox (7px radius!)
      if (p && p.invuln <= 0 && Math.hypot(eb.x - p.x, eb.y - p.y) < 8.5) {
        state.enemyBullets.splice(i, 1);
        hitPlayer();
      }
    }

    // Items & Magnetic Pickup
    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.spin += dt * 5.5;

      // Gentle cockpit magnet within 74px!
      if (p) {
        const dist = Math.hypot(p.x - it.x, p.y - it.y);
        if (dist < 26) {
          state.items.splice(i, 1);
          collectItem(it);
          continue;
        }
        if (dist < 82) {
          it.x += ((p.x - it.x) / dist) * 260 * dt;
          it.y += ((p.y - it.y) / dist) * 260 * dt;
        }
      }

      it.x += it.vx * dt;
      it.y += it.vy * dt;

      if (it.bounces > 0) {
        if (it.x < 20 || it.x > W - 20) {
          it.vx *= -1;
          it.x = Math.max(20, Math.min(W - 20, it.x));
          it.bounces--;
        }
        if (it.y < 52 || (it.y > H - 48 && it.vy > 0)) {
          it.vy *= -1;
          it.y = Math.max(52, Math.min(H - 48, it.y));
          it.bounces--;
        }
      } else if (it.y > H + 36) {
        state.items.splice(i, 1);
      }
    }

    // Explosions, Sparks, Popups
    for (let i = state.explosions.length - 1; i >= 0; i--) {
      const ex = state.explosions[i];
      ex.frame += ex.speed * dt;
      if (ex.frame >= SPRITES.fx.length) state.explosions.splice(i, 1);
    }

    for (let i = state.sparks.length - 1; i >= 0; i--) {
      const sp = state.sparks[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.life -= dt;
      if (sp.life <= 0) state.sparks.splice(i, 1);
    }

    for (let i = state.popups.length - 1; i >= 0; i--) {
      const pp = state.popups[i];
      pp.y -= 36 * dt;
      pp.life -= dt;
      if (pp.life <= 0) state.popups.splice(i, 1);
    }
  }

  /* =========================================================================
   * 10. HIGH-SPEED HARDWARE BLIT RENDERER (Locked 60 FPS)
   * ========================================================================= */
  function render() {
    ctx.save();

    if (state.screenShake > 0) {
      const m = state.screenShake * 13;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }

    // 1. Tiled Seamless Deep Ocean Layer
    const oceanTile = SPRITES.bg.ocean;
    const startY = (state.oceanScroll % 256) - 256;
    for (let y = startY; y < H; y += 256) {
      for (let x = 0; x < W; x += 256) {
        ctx.drawImage(oceanTile, x, y);
      }
    }

    // 2. Tropical Islands Layer
    state.islands.forEach((isl) => {
      const iw = 180 * isl.scale;
      const ih = 150 * isl.scale;
      ctx.drawImage(SPRITES.bg.islandA, isl.x - iw / 2, isl.y - ih / 2, iw, ih);
    });

    // 3. Surface Naval Battleships (drawn below clouds & planes!)
    for (let i = 0; i < state.enemies.length; i++) {
      const en = state.enemies[i];
      if (en.ground) {
        ctx.drawImage(SPRITES.enemies.battleship, en.x - 34, en.y - 68);
      }
    }

    // 4. Translucent High-Altitude Clouds
    state.clouds.forEach((cl) => {
      const cw = 190 * cl.scale;
      const ch = 120 * cl.scale;
      ctx.drawImage(SPRITES.bg.cloud, cl.x - cw / 2, cl.y - ch / 2, cw, ch);
    });

    // 5. Items & Spinning Gold Medals
    for (let i = 0; i < state.items.length; i++) {
      const it = state.items[i];
      if (it.kind === 'medal') {
        const scaleX = Math.max(0.32, Math.abs(Math.cos(it.spin)));
        ctx.save();
        ctx.translate(it.x, it.y);
        ctx.scale(scaleX, 1);
        ctx.drawImage(SPRITES.items.medal, -14, -14);
        ctx.restore();
      } else {
        ctx.drawImage(SPRITES.items[it.kind], it.x - 19, it.y - 19);
      }
    }

    // 6. Player Projectiles
    for (let i = 0; i < state.bullets.length; i++) {
      const b = state.bullets[i];
      if (b.kind === 'vulcan') {
        ctx.drawImage(SPRITES.bullets.vulcan, b.x - 6, b.y - 13);
      } else if (b.kind === 'laser') {
        ctx.drawImage(SPRITES.bullets.laser, b.x - 9, b.y - 24);
      } else if (b.kind === 'missile') {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
        ctx.drawImage(SPRITES.bullets.missile, -8, -14);
        ctx.restore();
      } else {
        ctx.drawImage(SPRITES.bullets.rocket, b.x - 9, b.y - 15);
      }
    }

    // 7. Giant Stage Boss
    if (state.boss) {
      const bs = state.boss;
      // Drop shadow over ocean
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(bs.x + 18, bs.y + 34, 92, 32, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.drawImage(SPRITES.enemies.bossBody, bs.x - 115, bs.y - 68);
      if (bs.leftTurretHp > 0) {
        ctx.drawImage(SPRITES.enemies.bossTurret, bs.x - 68 - 22, bs.y + 12 - 22);
      }
      if (bs.rightTurretHp > 0) {
        ctx.drawImage(SPRITES.enemies.bossTurret, bs.x + 68 - 22, bs.y + 12 - 22);
      }
    }

    // 8. Airborne Enemies
    for (let i = 0; i < state.enemies.length; i++) {
      const en = state.enemies[i];
      if (en.ground) continue;
      const spr = SPRITES.enemies[en.kind];
      // Aircraft shadow on water below
      ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
      ctx.beginPath();
      ctx.ellipse(en.x + 14, en.y + 22, spr.width * 0.28, spr.height * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.drawImage(spr, en.x - spr.width / 2, en.y - spr.height / 2);
    }

    // 9. Player Fighter + Evolved Hull + Wingman Drones + Shield
    const p = state.player;
    const nowMs = performance.now();
    if (p && state.mode !== 'gameover') {
      const blinkHide = p.invuln > 0 && Math.floor(nowMs / 75) % 2 === 0;
      if (!blinkHide) {
        const tier = p.power >= 4 ? 3 : p.power >= 2 ? 2 : 1;
        const fSpr = SPRITES.fighters[state.fighterType][tier];

        // Shadow on water
        ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
        ctx.beginPath();
        ctx.ellipse(p.x + 16, p.y + 26, 22, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Twin or Quad Afterburner Flames
        const flameLen = (p.thrust > 0 ? 18 : p.thrust < 0 ? 7 : 12) + (Math.floor(nowMs / 40) % 6);
        ctx.fillStyle = p.power >= 4 ? '#38bdf8' : '#fbbf24';
        if (state.fighterType === 'lightning') {
          ctx.fillRect(p.x - 13, p.y + 24, 4, flameLen);
          ctx.fillRect(p.x + 9, p.y + 24, 4, flameLen);
        } else {
          ctx.fillRect(p.x - 5, p.y + 24, 10, flameLen);
        }

        // Banking 3D Perspective Tilt
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(1 - Math.abs(p.bank) * 0.16, 1);
        ctx.rotate(p.bank * 0.12);
        ctx.drawImage(fSpr, -fSpr.width / 2, -fSpr.height / 2);
        ctx.restore();

        // Autonomous Wingman Drones
        const drones = getDronePositions(p);
        drones.forEach((d) => {
          ctx.drawImage(SPRITES.fighters.drone, d.x - 16, d.y - 16);
        });

        // Energy Shield Barrier
        if (p.shield) {
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.82)';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 34, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // 10. Allied B-29 Air-Strike Squadron
    state.airStrikeBombers.forEach((bm) => {
      ctx.drawImage(SPRITES.fighters.bomber, bm.x - 75, bm.y - 60);
    });

    // 11. Volumetric Explosions & Sparks
    for (let i = 0; i < state.explosions.length; i++) {
      const ex = state.explosions[i];
      const spr = SPRITES.fx[Math.min(SPRITES.fx.length - 1, Math.floor(ex.frame))];
      const sz = 96 * ex.scale;
      ctx.drawImage(spr, ex.x - sz / 2, ex.y - sz / 2, sz, sz);
    }

    for (let i = 0; i < state.sparks.length; i++) {
      const sp = state.sparks[i];
      ctx.fillStyle = sp.color;
      ctx.fillRect(sp.x - 1.5, sp.y - 1.5, 3, 3);
    }

    // 12. High-Contrast Enemy Bullets (Always drawn on top so player sees every bullet clearly!)
    for (let i = 0; i < state.enemyBullets.length; i++) {
      const eb = state.enemyBullets[i];
      const spr = eb.amber ? SPRITES.bullets.enemyAmber : SPRITES.bullets.enemyRed;
      ctx.drawImage(spr, eb.x - 10, eb.y - 10);
    }

    // 13. Floating Tactical Popups
    ctx.font = 'italic 700 13px Chakra Petch, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < state.popups.length; i++) {
      const pp = state.popups[i];
      ctx.globalAlpha = Math.max(0, pp.life / pp.maxLife);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(pp.text, pp.x + 1, pp.y + 1);
      ctx.fillStyle = pp.color;
      ctx.fillText(pp.text, pp.x, pp.y);
    }
    ctx.globalAlpha = 1;

    if (state.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${state.flashAlpha})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.045, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  resizeCanvas();
  seedScenery();
  updateHud();
  requestAnimationFrame(loop);
})();
