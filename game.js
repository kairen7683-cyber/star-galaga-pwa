(() => {
  'use strict';

  /* =========================================================================
   * 1. WEB AUDIO ARCADE SOUND ENGINE (Zero External MP3 Lag)
   * ========================================================================= */
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.lastShotAt = 0;
      this.lastClinkAt = 0;
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
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.25);
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
      if (now - this.lastShotAt < 58) return;
      this.lastShotAt = now;
      this.tone(760 + powerLv * 48, 220, 0.045, 'triangle', 0.038);
    }

    laserBeam() {
      this.tone(1380, 420, 0.085, 'sawtooth', 0.036);
    }

    missileLaunch() {
      this.noise(0.085, 0.042, 2400);
    }

    armorClink() {
      const now = performance.now();
      if (now - this.lastClinkAt < 75) return;
      this.lastClinkAt = now;
      this.tone(1180, 680, 0.032, 'square', 0.025);
    }

    explodeSmall() {
      this.noise(0.18, 0.095, 1050);
      this.tone(240, 54, 0.15, 'sawtooth', 0.055);
    }

    explodeBig() {
      this.noise(0.52, 0.21, 780);
      this.tone(155, 34, 0.46, 'sawtooth', 0.11);
    }

    powerUp(isMax = false) {
      const notes = isMax ? [523, 659, 784, 1046, 1318] : [440, 554, 659, 880];
      notes.forEach((n, i) => this.tone(n, n * 1.02, 0.085, 'square', 0.065, i * 0.06));
    }

    medal() {
      this.tone(988, 1318, 0.075, 'sine', 0.058);
    }

    warningSiren() {
      for (let i = 0; i < 3; i++) {
        this.tone(410, 760, 0.25, 'sawtooth', 0.08, i * 0.34);
      }
    }

    airStrike() {
      this.noise(0.8, 0.23, 680);
      this.tone(135, 42, 0.72, 'sawtooth', 0.12);
    }
  }

  /* =========================================================================
   * 2. HD 3D PRE-RENDERED PBR ASSET VAULT + PROCEDURAL PROJECTILES/CLOUDS
   *    StarCraft: Remastered / Sky Force Reloaded Visual Pipeline (Locked 60FPS)
   * ========================================================================= */
  function makeCanvas(w, h, drawFn) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cx = c.getContext('2d');
    drawFn(cx, w, h);
    return c;
  }

  function makeShadowSprite(img, targetW, targetH) {
    return makeCanvas(targetW, targetH, (c, w, h) => {
      c.drawImage(img, 0, 0, w, h);
      c.globalCompositeOperation = 'source-in';
      c.fillStyle = 'rgba(2, 6, 16, 0.46)';
      c.fillRect(0, 0, w, h);
    });
  }

  function buildProceduralOverlays() {
    const overlays = {
      clouds: [],
      bullets: {},
      items: {},
      propBlur: null
    };

    // High-altitude realistic translucent cloud puffs
    overlays.cloud = makeCanvas(240, 150, (c) => {
      const puffs = [
        [85, 78, 52],
        [135, 68, 58],
        [168, 86, 44],
        [62, 90, 38],
        [118, 92, 48]
      ];
      puffs.forEach(([x, y, r]) => {
        const g = c.createRadialGradient(x - 8, y - 8, 4, x, y, r);
        g.addColorStop(0, 'rgba(248, 250, 252, 0.24)');
        g.addColorStop(0.55, 'rgba(226, 232, 240, 0.12)');
        g.addColorStop(1, 'rgba(203, 213, 225, 0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      });
    });

    // Spinning propeller motion blur disc
    overlays.propBlur = makeCanvas(28, 10, (c) => {
      const g = c.createRadialGradient(14, 5, 1, 14, 5, 14);
      g.addColorStop(0, 'rgba(255,255,255,0.65)');
      g.addColorStop(0.6, 'rgba(226,232,240,0.32)');
      g.addColorStop(1, 'rgba(226,232,240,0)');
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(14, 5, 13, 3.5, 0, 0, Math.PI * 2);
      c.fill();
    });

    // Crisp High-Luminance Player & Enemy Projectiles
    overlays.bullets.vulcan = makeCanvas(14, 30, (c) => {
      const g = c.createRadialGradient(7, 15, 1, 7, 15, 12);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.38, '#fde047');
      g.addColorStop(0.75, 'rgba(249, 115, 22, 0.65)');
      g.addColorStop(1, 'rgba(249, 115, 22, 0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 14, 30);
      c.fillStyle = '#ffffff';
      c.fillRect(5, 4, 4, 20);
    });

    overlays.bullets.vulcanMax = makeCanvas(16, 34, (c) => {
      const g = c.createRadialGradient(8, 17, 1, 8, 17, 14);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.4, '#38bdf8');
      g.addColorStop(0.78, 'rgba(250, 204, 21, 0.65)');
      g.addColorStop(1, 'rgba(56, 189, 248, 0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 16, 34);
      c.fillStyle = '#ffffff';
      c.fillRect(5.5, 3, 5, 25);
    });

    overlays.bullets.laser = makeCanvas(20, 56, (c) => {
      const g = c.createLinearGradient(0, 0, 20, 0);
      g.addColorStop(0, 'rgba(34, 211, 238, 0)');
      g.addColorStop(0.28, 'rgba(56, 189, 248, 0.85)');
      g.addColorStop(0.5, '#ffffff');
      g.addColorStop(0.72, 'rgba(56, 189, 248, 0.85)');
      g.addColorStop(1, 'rgba(34, 211, 238, 0)');
      c.fillStyle = g;
      c.fillRect(2, 0, 16, 56);
    });

    overlays.bullets.missile = makeCanvas(18, 30, (c) => {
      c.fillStyle = '#e2e8f0';
      c.fillRect(6, 5, 6, 17);
      c.fillStyle = '#ef4444';
      c.beginPath();
      c.moveTo(9, 0);
      c.lineTo(13, 6);
      c.lineTo(5, 6);
      c.closePath();
      c.fill();
      c.fillStyle = '#64748b';
      c.fillRect(3, 16, 12, 4);
      c.fillStyle = '#fde047';
      c.fillRect(6, 22, 6, 7);
    });

    overlays.bullets.rocket = makeCanvas(20, 34, (c) => {
      c.fillStyle = '#cbd5e1';
      c.fillRect(6, 7, 8, 17);
      c.fillStyle = '#f97316';
      c.beginPath();
      c.moveTo(10, 0);
      c.lineTo(15, 8);
      c.lineTo(5, 8);
      c.closePath();
      c.fill();
      c.fillStyle = '#fde047';
      c.fillRect(6, 24, 8, 9);
    });

    // High-contrast Arcade Enemy Bullets (Dark outline + neon outer halo + pure white core so NEVER invisible on HD maps!)
    const makeEnemyOrb = (outerHex, midHex, sz = 22) =>
      makeCanvas(sz, sz, (c) => {
        const r = sz / 2;
        c.fillStyle = 'rgba(0, 0, 0, 0.55)';
        c.beginPath();
        c.arc(r, r, r * 0.68, 0, Math.PI * 2);
        c.fill();

        const g = c.createRadialGradient(r, r, 1, r, r, r * 0.92);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.36, midHex);
        g.addColorStop(0.7, outerHex);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(r, r, r * 0.92, 0, Math.PI * 2);
        c.fill();

        c.fillStyle = '#ffffff';
        c.beginPath();
        c.arc(r, r, r * 0.3, 0, Math.PI * 2);
        c.fill();
      });

    overlays.bullets.enemyRed = makeEnemyOrb('rgba(239, 68, 68, 0.95)', '#fca5a5', 22);
    overlays.bullets.enemyAmber = makeEnemyOrb('rgba(245, 158, 11, 0.95)', '#fde047', 22);
    overlays.bullets.enemyPurple = makeEnemyOrb('rgba(217, 70, 239, 0.95)', '#f0abfc', 26);

    // 3D Metallic Arcade Item Capsules ([P], [B], [S]) + Gold Bullion Medal
    const makeCapsule = (label, c1, c2, rim) =>
      makeCanvas(42, 42, (c) => {
        const halo = c.createRadialGradient(21, 21, 5, 21, 21, 20);
        halo.addColorStop(0, rim);
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = halo;
        c.fillRect(0, 0, 42, 42);

        const g = c.createLinearGradient(7, 7, 35, 35);
        g.addColorStop(0, c1);
        g.addColorStop(1, c2);
        c.fillStyle = g;
        c.beginPath();
        if (typeof c.roundRect === 'function') c.roundRect(7, 7, 28, 28, 7);
        else c.rect(7, 7, 28, 28);
        c.fill();
        c.lineWidth = 2.2;
        c.strokeStyle = '#ffffff';
        c.stroke();

        // Metallic corner rivets
        c.fillStyle = 'rgba(255,255,255,0.75)';
        [[11, 11], [31, 11], [11, 31], [31, 31]].forEach(([rx, ry]) => c.fillRect(rx - 1, ry - 1, 2, 2));

        c.fillStyle = '#ffffff';
        c.font = 'italic 900 17px Chakra Petch, sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(label, 21, 22);
      });

    overlays.items.P = makeCapsule('P', '#ef4444', '#991b1b', 'rgba(248,113,113,0.65)');
    overlays.items.B = makeCapsule('B', '#f59e0b', '#92400e', 'rgba(251,191,36,0.65)');
    overlays.items.S = makeCapsule('S', '#06b6d4', '#155e75', 'rgba(34,211,238,0.65)');
    overlays.items.medal = makeCanvas(30, 30, (c) => {
      const g = c.createLinearGradient(5, 4, 25, 26);
      g.addColorStop(0, '#fef9c3');
      g.addColorStop(0.45, '#facc15');
      g.addColorStop(1, '#a16207');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(15, 2);
      c.lineTo(26, 15);
      c.lineTo(15, 28);
      c.lineTo(4, 15);
      c.closePath();
      c.fill();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 1.6;
      c.stroke();
      c.fillStyle = '#713f12';
      c.font = '900 11px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('★', 15, 16);
    });

    return overlays;
  }

  /* =========================================================================
   * 3. ASYNC HD WEBP SPRITE & TERRAIN LOADER
   * ========================================================================= */
  const HD = {
    ready: false,
    terrains: {},
    fighters: { lightning: {}, skyray: {}, shinden: {} },
    fighterShadows: { lightning: {}, skyray: {}, shinden: {} },
    enemies: {},
    enemyShadows: {},
    bosses: [],
    bossShadows: [],
    drone: null,
    bomber: null,
    bomberShadow: null,
    explosionFrames: [],
    ov: buildProceduralOverlays()
  };

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        if (typeof img.decode === 'function') {
          img.decode().then(() => resolve(img)).catch(() => resolve(img));
        } else {
          resolve(img);
        }
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  async function loadAllHdAssets() {
    const manifest = [
      ['terrain_pacific', './assets/terrain_pacific.webp'],
      ['terrain_fortress', './assets/terrain_fortress.webp'],
      ['lightning_1', './assets/fighter_lightning_1.webp'],
      ['lightning_2', './assets/fighter_lightning_2.webp'],
      ['lightning_3', './assets/fighter_lightning_3.webp'],
      ['skyray_1', './assets/fighter_skyray_1.webp'],
      ['skyray_2', './assets/fighter_skyray_2.webp'],
      ['skyray_3', './assets/fighter_skyray_3.webp'],
      ['shinden_1', './assets/fighter_shinden_1.webp'],
      ['shinden_2', './assets/fighter_shinden_2.webp'],
      ['shinden_3', './assets/fighter_shinden_3.webp'],
      ['drone', './assets/drone.webp'],
      ['bomber', './assets/bomber_b29.webp'],
      ['scout', './assets/enemy_scout.webp'],
      ['supply', './assets/enemy_supply.webp'],
      ['gunship', './assets/enemy_gunship.webp'],
      ['battleship', './assets/enemy_battleship.webp'],
      ['boss1', './assets/boss1_valkyrie.webp'],
      ['boss2', './assets/boss2_dreadnought.webp'],
      ['boss3', './assets/boss3_leviathan.webp'],
      ['explosion', './assets/explosion_strip.webp']
    ];

    const loaded = {};
    await Promise.all(
      manifest.map(async ([key, url]) => {
        loaded[key] = await loadImage(url);
      })
    );

    HD.terrains.pacific = loaded.terrain_pacific;
    HD.terrains.fortress = loaded.terrain_fortress;

    // Fighters & their true silhouette altitude shadows (display sizes in logical CSS px)
    const fDisplay = {
      1: [64, 60],
      2: [74, 64],
      3: [82, 66]
    };
    ['lightning', 'skyray', 'shinden'].forEach((type) => {
      for (let tier = 1; tier <= 3; tier++) {
        const img = loaded[`${type}_${tier}`];
        const aspect = img.height / img.width;
        const dw = fDisplay[tier][0];
        const dh = Math.round(dw * aspect);
        HD.fighters[type][tier] = { img, w: dw, h: dh };
        HD.fighterShadows[type][tier] = makeShadowSprite(img, dw, dh);
      }
    });

    HD.drone = { img: loaded.drone, w: 30, h: Math.round(30 * (loaded.drone.height / loaded.drone.width)) };
    HD.bomber = { img: loaded.bomber, w: 164, h: Math.round(164 * (loaded.bomber.height / loaded.bomber.width)) };
    HD.bomberShadow = makeShadowSprite(loaded.bomber, HD.bomber.w, HD.bomber.h);

    const eSizes = { scout: 54, supply: 58, gunship: 108, battleship: 46 };
    ['scout', 'supply', 'gunship', 'battleship'].forEach((k) => {
      const img = loaded[k];
      const dw = eSizes[k];
      const dh = Math.round(dw * (img.height / img.width));
      HD.enemies[k] = { img, w: dw, h: dh };
      if (k !== 'battleship') {
        HD.enemyShadows[k] = makeShadowSprite(img, dw, dh);
      }
    });

    // 3 Colossal Stage Bosses!
    const bossConfigs = [
      { img: loaded.boss1, w: 276, name: 'XB-0 IRON VALKYRIE', turretOffsetX: 74, turretOffsetY: 8 },
      { img: loaded.boss2, w: 230, name: 'YAMATO-X DREADNOUGHT', turretOffsetX: 68, turretOffsetY: 16 },
      { img: loaded.boss3, w: 242, name: 'GIGA LEVIATHAN', turretOffsetX: 64, turretOffsetY: 18 }
    ];
    bossConfigs.forEach((bc, idx) => {
      const dh = Math.round(bc.w * (bc.img.height / bc.img.width));
      HD.bosses[idx] = { ...bc, h: dh };
      HD.bossShadows[idx] = makeShadowSprite(bc.img, bc.w, dh);
    });

    // Slice 12 frames (128x128 each) from explosion_strip.webp
    for (let f = 0; f < 12; f++) {
      HD.explosionFrames.push(
        makeCanvas(128, 128, (c) => {
          c.drawImage(loaded.explosion, f * 128, 0, 128, 128, 0, 0, 128, 128);
        })
      );
    }

    HD.ready = true;
    renderHangarPreviews();
    btnStartGame.textContent = '1인 단독 출격';
  }

  /* =========================================================================
   * 4. DOM ELEMENTS, PILOT PROFILE, ONLINE RANKING & 2P CO-OP SYSTEM
   * ========================================================================= */
  const sound = new SoundEngine();
  const appShellEl = document.getElementById('app-shell');
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const viewportEl = document.getElementById('stage-viewport');
  const selectedFighterDescEl = document.getElementById('selected-fighter-desc');

  const scoreEl = document.getElementById('score-display');
  const highScoreEl = document.getElementById('high-score-display');
  const livesRackEl = document.getElementById('lives-rack');
  const stageChipEl = document.getElementById('stage-chip');
  const coopHudBadgeEl = document.getElementById('coop-hud-badge');
  const powerTextEl = document.getElementById('power-level-text');
  const powerPipsEl = document.getElementById('power-pips');
  const bombCountEl = document.getElementById('bomb-count');

  const bossHudEl = document.getElementById('boss-hud');
  const bossNameEl = document.getElementById('boss-name-label');
  const bossHpPctEl = document.getElementById('boss-hp-pct');
  const bossHpFillEl = document.getElementById('boss-hp-fill');

  const btnAutoFire = document.getElementById('btn-autofire');
  const btnSound = document.getElementById('btn-sound');
  const btnPause = document.getElementById('btn-pause');
  const btnFormation = document.getElementById('btn-formation');
  const formationLabelEl = document.getElementById('formation-label');
  const btnHyperBomb = document.getElementById('btn-hyper-bomb');

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
  const btnGameoverRanking = document.getElementById('btn-gameover-ranking');

  // Pilot Callsign, Ranking & 2P Co-op Elements
  const callsignInputEl = document.getElementById('pilot-callsign-input');
  const pilotSavedTagEl = document.getElementById('pilot-saved-tag');
  const btnOpenRanking = document.getElementById('btn-open-ranking');
  const myRankBadgeEl = document.getElementById('my-rank-badge');
  const rankingModalEl = document.getElementById('ranking-modal');
  const myRankSummaryEl = document.getElementById('my-rank-summary');
  const leaderboardListEl = document.getElementById('leaderboard-list');
  const btnCloseRanking = document.getElementById('btn-close-ranking');

  const btnOpenCoop = document.getElementById('btn-open-coop');
  const coopModalEl = document.getElementById('coop-modal');
  const coopStatusMsgEl = document.getElementById('coop-status-msg');
  const coopEntryBoxEl = document.getElementById('coop-entry-box');
  const coopRoomBoxEl = document.getElementById('coop-room-box');
  const btnCoopCreate = document.getElementById('btn-coop-create');
  const btnCoopQuick = document.getElementById('btn-coop-quick');
  const coopCodeInputEl = document.getElementById('coop-code-input');
  const btnCoopJoin = document.getElementById('btn-coop-join');
  const openRoomsWrapEl = document.getElementById('open-rooms-wrap');
  const openRoomsListEl = document.getElementById('open-rooms-list');
  const coopRoomCodeDisplayEl = document.getElementById('coop-room-code-display');
  const coopSlot1CardEl = document.getElementById('coop-slot-1');
  const coopSlot2CardEl = document.getElementById('coop-slot-2');
  const coopSlot1NameEl = document.getElementById('coop-slot1-name');
  const coopSlot1FighterEl = document.getElementById('coop-slot1-fighter');
  const coopSlot2NameEl = document.getElementById('coop-slot2-name');
  const coopSlot2FighterEl = document.getElementById('coop-slot2-fighter');
  const btnCoopLaunch = document.getElementById('btn-coop-launch');
  const btnCloseCoop = document.getElementById('btn-close-coop');

  // PWA Install & Handedness Layout Elements
  const btnInstallPwa = document.getElementById('btn-install-pwa');
  const btnHudInstall = document.getElementById('btn-hud-install');
  const btnPauseInstall = document.getElementById('btn-pause-install');
  const installModalEl = document.getElementById('install-modal');
  const installStepsEl = document.getElementById('install-steps-content');
  const btnOpenChrome = document.getElementById('btn-open-chrome');
  const btnCloseInstallModal = document.getElementById('btn-close-install-modal');

  const btnHudSwapHand = document.getElementById('btn-hud-swap-hand');
  const hudHandLabelEl = document.getElementById('hud-hand-label');
  const btnStandbyHandLayout = document.getElementById('btn-standby-hand-layout');
  const btnHandLayout = document.getElementById('btn-hand-layout');

  const STORAGE_KEY = 'strikers_1945_ace_highscore_v3';
  const PILOT_ID_KEY = 'strikers_1945_pilot_id_v1';
  const CALLSIGN_KEY = 'strikers_1945_callsign_v1';
  const HAND_LAYOUT_KEY = 'strikers_1945_hand_layout_v1';
  const ONLINE_BASE = 'https://crusader-caterer-overeater.ngrok-free.dev/api/strikers1945';
  const ONLINE_WS = 'wss://crusader-caterer-overeater.ngrok-free.dev/api/strikers1945/ws';
  const FIGHTER_NAMES = {
    lightning: 'P-38 라이트닝',
    skyray: 'XF-5F 스카이레이',
    shinden: 'J7W 신덴'
  };

  let handLayout = localStorage.getItem(HAND_LAYOUT_KEY) === 'left' ? 'left' : 'right';

  function applyHandLayout(side, notifyInGame = false) {
    handLayout = side === 'left' ? 'left' : 'right';
    localStorage.setItem(HAND_LAYOUT_KEY, handLayout);
    if (appShellEl) {
      appShellEl.classList.toggle('is-left-handed', handLayout === 'left');
    }
    if (hudHandLabelEl) {
      hudHandLabelEl.textContent = handLayout === 'left' ? '⇄ 우측으로' : '⇄ 좌측으로';
    }
    if (btnStandbyHandLayout) {
      btnStandbyHandLayout.textContent = handLayout === 'left' ? '스킬: 좌측 배치 ⇄' : '스킬: 우측 배치 ⇄';
    }
    if (btnHandLayout) {
      btnHandLayout.textContent =
        handLayout === 'left' ? '폭탄·편대비행 위치: 좌측 배치 ⇄' : '폭탄·편대비행 위치: 우측 배치 ⇄';
    }
    if (notifyInGame && state.mode === 'playing' && state.player) {
      addPopup(
        state.player.x,
        Math.max(54, state.player.y - 30),
        handLayout === 'left' ? '스킬 버튼: 좌측 배치!' : '스킬 버튼: 우측 배치!',
        '#38bdf8'
      );
    }
  }
  applyHandLayout(handLayout, false);

  let pilotId = localStorage.getItem(PILOT_ID_KEY);
  if (!pilotId) {
    pilotId = 'pilot_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem(PILOT_ID_KEY, pilotId);
  }
  let pilotCallsign = (localStorage.getItem(CALLSIGN_KEY) || '').trim();
  if (!pilotCallsign) {
    pilotCallsign = '에이스' + Math.floor(100 + Math.random() * 900);
    localStorage.setItem(CALLSIGN_KEY, pilotCallsign);
  }
  if (callsignInputEl) {
    callsignInputEl.value = pilotCallsign;
    callsignInputEl.addEventListener('input', () => {
      const cleaned = callsignInputEl.value.trim().slice(0, 10);
      pilotCallsign = cleaned || '에이스';
      localStorage.setItem(CALLSIGN_KEY, pilotCallsign);
      if (pilotSavedTagEl) {
        pilotSavedTagEl.textContent = '저장됨 ✓';
        pilotSavedTagEl.style.color = '#fbbf24';
      }
      if (coopState.ws && coopState.ws.readyState === 1 && coopState.roomCode) {
        coopSend({ type: 'select_fighter', fighter: state.fighterType, callsign: pilotCallsign });
      }
    });
  }

  let W = 380;
  let H = 640;
  let dpr = 1;
  let bannerTimer = null;

  // Deterministic PRNG for synchronized 2-Player Co-op enemy waves!
  let rngSeed = Date.now() % 2147483647;
  function setWaveSeed(seedVal) {
    rngSeed = (Math.abs(Number(seedVal) || 1945) % 2147483646) + 1;
  }
  function waveRand() {
    if (!coopState.active) return Math.random();
    rngSeed = (rngSeed * 48271) % 2147483647;
    return (rngSeed - 1) / 2147483646;
  }

  const coopState = {
    active: false,
    ws: null,
    roomCode: '',
    mySlot: 1,
    seed: 1945,
    syncTimer: 0,
    partner: {
      present: false,
      callsign: 'WINGMAN',
      fighter: 'skyray',
      x: 190,
      y: 520,
      targetX: 190,
      targetY: 520,
      bank: 0,
      power: 1,
      lives: 4,
      shield: false,
      invuln: 0,
      fireCd: 0,
      missileCd: 0,
      aiMode: false,
      aiReason: '',
      lastPacketAt: 0,
      aiWeavePhase: 0
    }
  };

  const state = {
    mode: 'title',
    fighterType: 'lightning',
    score: 0,
    highScore: Number(localStorage.getItem(STORAGE_KEY) || localStorage.getItem('strikers_1945_ace_highscore_v2') || 0),
    medals: 0,
    medalChain: 0,
    stage: 1,
    waveStep: 0,
    waveTimer: 1.2,
    bossActive: false,
    boss: null,
    lives: 4,
    bombs: 3,
    formationTime: 0,
    formationCd: 0,
    autoFire: true,
    nextLifeScore: 50000,
    terrainScroll: 0,
    screenShake: 0,
    flashAlpha: 0,
    player: null,
    bullets: [],
    enemyBullets: [],
    enemies: [],
    items: [],
    explosions: [],
    shockwaves: [],
    sparks: [],
    popups: [],
    airStrikeBombers: [],
    clouds: []
  };

  highScoreEl.textContent = state.highScore.toLocaleString();

  /* --- Online Leaderboard Fetch & Score Submit --- */
  let currentRankMode = 'all';

  async function fetchLeaderboard(modeFilter = currentRankMode) {
    currentRankMode = modeFilter;
    document.querySelectorAll('.rank-tab').forEach((t) => {
      t.classList.toggle('is-active', t.dataset.rankMode === modeFilter);
    });
    try {
      const res = await fetch(
        `${ONLINE_BASE}/leaderboard?mode=${encodeURIComponent(modeFilter)}&pilot_id=${encodeURIComponent(pilotId)}&_=${Date.now()}`,
        { headers: { 'ngrok-skip-browser-warning': '1' } }
      );
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      renderLeaderboardData(data);
      return data;
    } catch (_) {
      if (leaderboardListEl) {
        leaderboardListEl.innerHTML = `<div class="leaderboard-empty">오프라인 상태입니다. 내 최고 기록: ${state.highScore.toLocaleString()}점</div>`;
      }
      return null;
    }
  }

  function renderLeaderboardData(data) {
    if (!data) return;
    if (data.my_best && myRankBadgeEl) {
      myRankBadgeEl.textContent = `내 순위 #${data.my_best.rank}`;
    }
    if (myRankSummaryEl) {
      if (data.my_best) {
        myRankSummaryEl.innerHTML =
          `<span><strong>${data.my_best.callsign}</strong> 최고 기록</span>` +
          `<strong>#${data.my_best.rank}위 · ${Number(data.my_best.score).toLocaleString()}점 (R${data.my_best.stage})</strong>`;
      } else {
        myRankSummaryEl.innerHTML =
          `<span>파일럿 <strong>${pilotCallsign}</strong></span>` +
          `<span>첫 출격 시 실시간 순위가 등록됩니다</span>`;
      }
    }
    if (!leaderboardListEl) return;
    const rows = data.rankings || [];
    if (rows.length === 0) {
      leaderboardListEl.innerHTML = '<div class="leaderboard-empty">아직 등록된 기록이 없습니다.</div>';
      return;
    }
    leaderboardListEl.innerHTML = rows
      .map((r) => {
        const isMe = r.pilot_id === pilotId;
        const fLabel = FIGHTER_NAMES[r.fighter] || 'P-38';
        const modeTag = r.mode === 'coop' ? `2P협동${r.partner_callsign ? ' (with ' + r.partner_callsign + ')' : ''}` : '1인전';
        return (
          `<div class="leaderboard-row${isMe ? ' is-me' : ''}">` +
          `<span class="lb-rank">${r.rank}</span>` +
          `<div class="lb-pilot">` +
          `<span class="lb-callsign">${r.callsign}${isMe ? ' · 나' : ''}</span>` +
          `<span class="lb-meta">ROUND ${r.stage} · ${fLabel} · ${modeTag}</span>` +
          `</div>` +
          `<span class="lb-score">${Number(r.score).toLocaleString()}</span>` +
          `</div>`
        );
      })
      .join('');
  }

  async function submitOnlineScore() {
    if (state.score <= 0) return;
    try {
      const res = await fetch(`${ONLINE_BASE}/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': '1'
        },
        body: JSON.stringify({
          pilot_id: pilotId,
          callsign: pilotCallsign,
          score: state.score,
          stage: state.stage,
          fighter: state.fighterType,
          mode: coopState.active ? 'coop' : 'solo',
          partner_callsign: coopState.active && coopState.partner.present ? coopState.partner.callsign : ''
        })
      });
      if (!res.ok) return;
      const data = await res.json();
      renderLeaderboardData(data);
      if (data.my_best && finalMedalsEl) {
        finalMedalsEl.textContent = `#${data.my_best.rank}위`;
      }
    } catch (_) {}
  }

  // Initial background rank check on app open
  fetchLeaderboard('all');

  if (btnOpenRanking) {
    btnOpenRanking.addEventListener('click', () => {
      sound.unlock();
      sound.medal();
      rankingModalEl.hidden = false;
      fetchLeaderboard(currentRankMode);
    });
  }
  if (btnGameoverRanking) {
    btnGameoverRanking.addEventListener('click', () => {
      sound.unlock();
      rankingModalEl.hidden = false;
      fetchLeaderboard('all');
    });
  }
  if (btnCloseRanking) {
    btnCloseRanking.addEventListener('click', () => {
      rankingModalEl.hidden = true;
    });
  }
  document.querySelectorAll('.rank-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      sound.unlock();
      fetchLeaderboard(tab.dataset.rankMode);
    });
  });

  /* --- 2-Player Real-Time Co-op WebSocket System --- */
  function coopSend(payload) {
    if (coopState.ws && coopState.ws.readyState === 1) {
      try {
        coopState.ws.send(JSON.stringify(payload));
      } catch (_) {}
    }
  }

  async function refreshOpenCoopRooms() {
    try {
      const res = await fetch(`${ONLINE_BASE}/rooms?_=${Date.now()}`, {
        headers: { 'ngrok-skip-browser-warning': '1' }
      });
      if (!res.ok) return;
      const data = await res.json();
      const list = data.open_rooms || [];
      if (openRoomsWrapEl && openRoomsListEl) {
        if (list.length === 0) {
          openRoomsWrapEl.hidden = true;
        } else {
          openRoomsWrapEl.hidden = false;
          openRoomsListEl.innerHTML = list
            .map(
              (rm) =>
                `<button type="button" class="open-room-chip" data-join-code="${rm.code}">` +
                `<strong>#${rm.code}</strong> ${rm.host_callsign} 대기 중` +
                `</button>`
            )
            .join('');
          openRoomsListEl.querySelectorAll('.open-room-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
              connectCoopRoom('join', chip.dataset.joinCode);
            });
          });
        }
      }
    } catch (_) {}
  }

  function updateCoopLobbyUI(roomData) {
    if (!roomData) return;
    coopEntryBoxEl.hidden = true;
    coopRoomBoxEl.hidden = false;
    coopRoomCodeDisplayEl.textContent = roomData.code || '----';

    const p1 = roomData.players && roomData.players['1'];
    const p2 = roomData.players && roomData.players['2'];

    if (p1) {
      coopSlot1CardEl.classList.add('is-filled');
      coopSlot1NameEl.textContent = p1.callsign + (coopState.mySlot === 1 ? ' (나)' : '');
      coopSlot1FighterEl.textContent = FIGHTER_NAMES[p1.fighter] || 'P-38 라이트닝';
    } else {
      coopSlot1CardEl.classList.remove('is-filled');
      coopSlot1NameEl.textContent = '대기 중...';
      coopSlot1FighterEl.textContent = '-';
    }

    if (p2) {
      coopSlot2CardEl.classList.add('is-filled');
      coopSlot2NameEl.textContent = p2.callsign + (coopState.mySlot === 2 ? ' (나)' : '');
      coopSlot2FighterEl.textContent = FIGHTER_NAMES[p2.fighter] || 'XF-5F 스카이레이';
    } else {
      coopSlot2CardEl.classList.remove('is-filled');
      coopSlot2NameEl.textContent = '합류 대기 중...';
      coopSlot2FighterEl.textContent = '4자리 코드로 입장 가능';
    }

    const otherSlot = coopState.mySlot === 1 ? p2 : p1;
    if (otherSlot) {
      coopState.partner.present = true;
      coopState.partner.callsign = otherSlot.callsign;
      coopState.partner.fighter = otherSlot.fighter || 'skyray';
      coopStatusMsgEl.textContent = `${otherSlot.callsign} 파일럿과 편대 연결 완료! 아래 출격 버튼을 누르면 동시 출격합니다.`;
      btnCoopLaunch.disabled = false;
      btnCoopLaunch.textContent = '2인 편대 동시 출격!';
    } else {
      coopState.partner.present = false;
      coopStatusMsgEl.textContent = '상대방 폰에서 [2인 협동 출격] → 위 4자리 방 코드를 입력하면 즉시 연결됩니다.';
      btnCoopLaunch.disabled = true;
      btnCoopLaunch.textContent = '2P 파트너 합류 대기 중...';
    }
  }

  function updateCoopHudBadge() {
    if (!coopHudBadgeEl) return;
    coopHudBadgeEl.hidden = !coopState.active;
    if (!coopState.active) return;
    const pt = coopState.partner;
    if (pt.aiMode) {
      coopHudBadgeEl.classList.add('is-ai');
      coopHudBadgeEl.textContent =
        pt.aiReason === 'left' ? `2P 🤖 AI윙맨(${pt.callsign})` : `2P 🤖 AI자동(${pt.callsign})`;
    } else {
      coopHudBadgeEl.classList.remove('is-ai');
      coopHudBadgeEl.textContent = `2P #${coopState.roomCode}`;
    }
  }

  function switchPartnerToAi(reason) {
    if (!coopState.active) return;
    const pt = coopState.partner;
    const alreadySame = pt.aiMode && pt.aiReason === reason;
    pt.present = true;
    pt.lives = Math.max(1, pt.lives || 4);
    pt.aiMode = true;
    pt.aiReason = reason;
    updateCoopHudBadge();
    if (!alreadySame && state.mode !== 'title') {
      if (reason === 'left') {
        showBanner(
          '🤖 파트너 이탈 — AI 모드 전환!',
          `${pt.callsign}님이 나가서 AI 윙맨이 기체를 이어받아 끝까지 함께 싸웁니다!`,
          false,
          2400
        );
        addPopup(pt.x, Math.max(54, pt.y - 32), 'AI 윙맨 가동!', '#34d399');
      } else {
        showBanner(
          '🤖 파트너 일시정지 — AI 자동비행!',
          `${pt.callsign}님이 잠시 멈춰 AI가 자동으로 전투를 지원합니다!`,
          false,
          2200
        );
        addPopup(pt.x, Math.max(54, pt.y - 32), 'AI 자동비행 전환!', '#fde047');
      }
    }
  }

  function restorePartnerFromAi() {
    if (!coopState.active) return;
    const pt = coopState.partner;
    if (!pt.aiMode) return;
    pt.aiMode = false;
    pt.aiReason = '';
    pt.lastPacketAt = performance.now();
    updateCoopHudBadge();
    if (state.mode !== 'title') {
      showBanner(
        '✈️ 파트너 전투 복귀!',
        `${pt.callsign}님이 돌아와 직접 조종을 재개합니다!`,
        false,
        2000
      );
      addPopup(pt.x, Math.max(54, pt.y - 32), `${pt.callsign} 복귀!`, '#38bdf8');
    }
  }

  function connectCoopRoom(actionType, codeStr = '') {
    sound.unlock();
    if (coopState.ws) {
      try {
        coopState.ws.close();
      } catch (_) {}
    }
    coopStatusMsgEl.textContent = '편대 작전 서버에 연결 중...';
    const ws = new WebSocket(ONLINE_WS);
    coopState.ws = ws;

    ws.addEventListener('open', () => {
      coopSend({
        type: actionType,
        code: codeStr,
        callsign: pilotCallsign,
        fighter: state.fighterType
      });
    });

    ws.addEventListener('message', (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch (_) {
        return;
      }
      if (msg.type === 'error') {
        coopStatusMsgEl.textContent = msg.message || '방 입장에 실패했습니다.';
        return;
      }
      if (msg.type === 'joined') {
        coopState.roomCode = msg.code;
        coopState.mySlot = msg.slot;
        coopState.seed = msg.seed;
      } else if (msg.type === 'room_state') {
        updateCoopLobbyUI(msg);
      } else if (msg.type === 'partner_left') {
        if (state.mode === 'title') {
          coopState.partner.present = false;
          updateCoopLobbyUI(msg.room);
        } else {
          // Keep partner plane active in AI Wingman mode instead of disappearing!
          switchPartnerToAi('left');
        }
      } else if (msg.type === 'coop_launch') {
        coopState.seed = msg.seed;
        const p1 = msg.players && msg.players['1'];
        const p2 = msg.players && msg.players['2'];
        const other = coopState.mySlot === 1 ? p2 : p1;
        if (other) {
          coopState.partner.present = true;
          coopState.partner.callsign = other.callsign;
          coopState.partner.fighter = other.fighter || 'skyray';
          coopState.partner.aiMode = false;
          coopState.partner.aiReason = '';
          coopState.partner.lastPacketAt = performance.now();
        }
        coopModalEl.hidden = true;
        startNewGame(true);
      } else if (msg.type === 'p_state' && coopState.active) {
        const pt = coopState.partner;
        pt.present = true;
        pt.lastPacketAt = performance.now();
        if (pt.aiMode && pt.aiReason === 'pause') {
          restorePartnerFromAi();
        }
        if (!pt.aiMode) {
          pt.targetX = Math.max(26, Math.min(W - 26, (msg.nx || 0.5) * W));
          pt.targetY = Math.max(58, Math.min(H - 38, (msg.ny || 0.8) * H));
          pt.bank = msg.bank || 0;
          pt.power = msg.power || 1;
          pt.lives = typeof msg.lives === 'number' ? Math.max(1, msg.lives) : pt.lives;
          pt.shield = Boolean(msg.shield);
          pt.fighter = msg.fighter || pt.fighter;
          pt.callsign = msg.callsign || pt.callsign;
        }
        if (typeof msg.score === 'number' && msg.score > state.score) {
          state.score = msg.score;
          if (state.score > state.highScore) {
            state.highScore = state.score;
            localStorage.setItem(STORAGE_KEY, String(state.highScore));
          }
          scoreEl.textContent = state.score.toLocaleString();
          highScoreEl.textContent = state.highScore.toLocaleString();
        }
      } else if (msg.type === 'p_event' && coopState.active) {
        if (msg.ev === 'pause') {
          switchPartnerToAi('pause');
        } else if (msg.ev === 'resume') {
          restorePartnerFromAi();
        } else if (msg.ev === 'bomb') {
          triggerAirStrikeBomb(true);
        } else if (msg.ev === 'formation') {
          triggerFormationFlight(true);
        } else if (msg.ev === 'enemy_kill') {
          const target = state.enemies[msg.idx];
          if (target && !target.dead) {
            damageEnemy(target, 9999, true);
          }
        } else if (msg.ev === 'boss_dmg' && state.boss) {
          damageBoss(msg.dmg || 2, state.boss.x, state.boss.y, true, true);
        }
      }
    });

    ws.addEventListener('close', () => {
      if (state.mode === 'title' && !coopModalEl.hidden) {
        coopStatusMsgEl.textContent = '연결이 종료되었습니다. 다시 방을 만들거나 입장해주세요.';
      } else if (coopState.active && state.mode !== 'title') {
        switchPartnerToAi('left');
      }
    });
  }

  if (btnOpenCoop) {
    btnOpenCoop.addEventListener('click', () => {
      sound.unlock();
      sound.medal();
      coopModalEl.hidden = false;
      coopEntryBoxEl.hidden = false;
      coopRoomBoxEl.hidden = true;
      coopStatusMsgEl.textContent = '각자 스마트폰에서 접속해 한 화면에서 함께 적군과 보스를 격추합니다.';
      refreshOpenCoopRooms();
    });
  }
  if (btnCoopCreate) {
    btnCoopCreate.addEventListener('click', () => connectCoopRoom('create'));
  }
  if (btnCoopQuick) {
    btnCoopQuick.addEventListener('click', () => connectCoopRoom('quick'));
  }
  if (btnCoopJoin) {
    btnCoopJoin.addEventListener('click', () => {
      const code = (coopCodeInputEl.value || '').trim();
      if (code.length < 4) {
        coopStatusMsgEl.textContent = '4자리 숫자 방 코드를 입력해주세요.';
        return;
      }
      connectCoopRoom('join', code);
    });
  }
  if (btnCoopLaunch) {
    btnCoopLaunch.addEventListener('click', () => {
      sound.unlock();
      coopSend({ type: 'start_coop' });
    });
  }
  if (btnCloseCoop) {
    btnCloseCoop.addEventListener('click', () => {
      coopModalEl.hidden = true;
      if (coopState.ws) {
        try {
          coopState.ws.close();
        } catch (_) {}
        coopState.ws = null;
      }
      coopState.active = false;
    });
  }

  /* --- Service Worker & Bulletproof PWA Download Logic --- */
  if ('serviceWorker' in navigator) {
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!reloaded && state.mode === 'title') {
        reloaded = true;
        window.location.reload();
      }
    });
    if (window.location.hostname !== 'appassets.androidplatform.net') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./sw.js')
          .then((reg) => reg.update().catch(() => {}))
          .catch(() => {});
      });
    }
  }

  function isStandaloneApp() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.navigator.standalone === true ||
      window.location.hostname === 'appassets.androidplatform.net' ||
      /Strikers1945APK/i.test(navigator.userAgent || '')
    );
  }

  function syncInstallButtonsVisibility() {
    const hide = isStandaloneApp();
    if (btnInstallPwa) btnInstallPwa.hidden = hide;
    if (btnHudInstall) btnHudInstall.hidden = hide;
    if (btnPauseInstall) btnPauseInstall.hidden = hide;
    if (window.__pwaDeferredPrompt && !hide && btnInstallPwa) {
      btnInstallPwa.textContent = '홈 화면에 앱 바로 설치';
    }
  }
  syncInstallButtonsVisibility();
  window.addEventListener('pwa-prompt-ready', syncInstallButtonsVisibility);
  window.addEventListener('appinstalled', () => {
    window.__pwaDeferredPrompt = null;
    installModalEl.hidden = true;
    syncInstallButtonsVisibility();
  });

  async function triggerPwaInstall() {
    sound.unlock();
    if (window.__pwaDeferredPrompt) {
      const promptEvent = window.__pwaDeferredPrompt;
      promptEvent.prompt();
      await promptEvent.userChoice.catch(() => {});
      window.__pwaDeferredPrompt = null;
      syncInstallButtonsVisibility();
      return;
    }

    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /Android/i.test(ua);

    const btnApk = document.getElementById('btn-download-apk');
    if (btnApk) btnApk.hidden = isIOS;
    btnOpenChrome.hidden = !isAndroid;

    if (isIOS) {
      installStepsEl.innerHTML =
        '1. Safari 하단의 <strong>[공유]</strong> 버튼을 누르세요.<br/>' +
        '2. 메뉴에서 <strong>[홈 화면에 추가]</strong>를 선택하면 설치됩니다.';
    } else if (isAndroid) {
      installStepsEl.innerHTML =
        '<strong>설치 메뉴가 보이지 않을 때 해결 방법</strong><br/>' +
        '1. 휴대폰 <strong>[설정] → [홈 화면] → [홈 화면 레이아웃 잠금]</strong>을 꺼주세요.<br/>' +
        '2. 설정 변경 없이 바로 설치하려면 아래 <strong>[안드로이드 전용 앱(.APK) 다운로드]</strong>를 눌러 설치하세요.';
    } else {
      installStepsEl.innerHTML =
        '브라우저 주소창 우측의 <strong>[앱 설치]</strong> 아이콘 또는 메뉴의 <strong>[홈 화면에 추가]</strong>를 선택하세요.';
    }

    installModalEl.hidden = false;
  }

  if (btnInstallPwa) btnInstallPwa.addEventListener('click', triggerPwaInstall);
  if (btnHudInstall) btnHudInstall.addEventListener('click', triggerPwaInstall);
  if (btnPauseInstall) btnPauseInstall.addEventListener('click', triggerPwaInstall);
  btnCloseInstallModal.addEventListener('click', () => {
    installModalEl.hidden = true;
  });

  function renderHangarPreviews() {
    if (!HD.ready) return;
    ['lightning', 'skyray', 'shinden'].forEach((type) => {
      const pCanvas = document.getElementById(`preview-${type}`);
      if (!pCanvas) return;
      const pCtx = pCanvas.getContext('2d');
      pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
      pCtx.imageSmoothingEnabled = true;
      pCtx.imageSmoothingQuality = 'high';
      const spr = HD.fighters[type][3].img;
      const scale = Math.min(68 / spr.width, 68 / spr.height);
      const dw = spr.width * scale;
      const dh = spr.height * scale;
      pCtx.drawImage(spr, (76 - dw) / 2, (76 - dh) / 2, dw, dh);
    });
  }

  let showcaseBank = 0;
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
      showcaseBank = -0.85;
      if (selectedFighterDescEl && card.dataset.spec) {
        selectedFighterDescEl.textContent = card.dataset.spec;
      }
      if (coopState.ws && coopState.ws.readyState === 1 && coopState.roomCode) {
        coopSend({ type: 'select_fighter', fighter: state.fighterType, callsign: pilotCallsign });
      }
    });
  });

  function resizeCanvas() {
    const rect = viewportEl.getBoundingClientRect();
    W = Math.max(300, rect.width);
    H = Math.max(420, rect.height);
    // Crisp Super AMOLED Retina resolution (up to 2.5x DPR) — effortless 60 FPS with GPU WebP textures!
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (state.player) {
      state.player.x = Math.max(26, Math.min(W - 26, state.player.x));
      state.player.y = Math.max(58, Math.min(H - 38, state.player.y));
    }
  }
  window.addEventListener('resize', resizeCanvas);

  function seedScenery() {
    state.clouds = [
      { x: W * 0.2, y: H * 0.14, speed: 62, scale: 1.05 },
      { x: W * 0.78, y: H * 0.52, speed: 82, scale: 1.2 },
      { x: W * 0.44, y: H * 0.86, speed: 54, scale: 0.9 }
    ];
  }

  function createPlayer() {
    return {
      x: W / 2,
      y: H - 76,
      power: 1, // 1..5
      shield: false,
      invuln: 2.2,
      mainCd: 0,
      subCd: 0,
      bank: 0,
      thrust: 0,
      dronePhase: 0,
      muzzleFlash: 0
    };
  }

  function showBanner(title, sub, isWarning = false, ms = 2300) {
    waveTitleEl.textContent = title;
    waveSubEl.textContent = sub;
    waveBannerEl.classList.toggle('is-warning', isWarning);
    waveBannerEl.classList.add('is-visible');
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => waveBannerEl.classList.remove('is-visible'), ms);
  }

  function addScore(pts, x, y, label = null, color = '#fde047') {
    state.score += pts;
    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem(STORAGE_KEY, String(state.highScore));
    }
    if (state.score >= state.nextLifeScore) {
      state.nextLifeScore += 70000;
      if (state.lives < 6) {
        state.lives++;
        sound.powerUp(true);
        addPopup(W / 2, H / 2, '1UP EXTRA FIGHTER!', '#4ade80');
      }
    }
    if (label && x != null && y != null) addPopup(x, y, label, color);
    updateHud();
  }

  function addPopup(x, y, text, color = '#fde047') {
    state.popups.push({ x, y, text, color, life: 0.95, maxLife: 0.95 });
  }

  function spawnExplosion(x, y, scale = 1.0, sparkCount = 10, shockwave = false) {
    state.explosions.push({ x, y, scale, frame: 0, speed: 24 });
    if (shockwave) {
      state.shockwaves.push({ x, y, r: 8, maxR: 72 * scale, alpha: 0.85 });
    }
    const palette = ['#ffffff', '#fde047', '#fb923c', '#ef4444'];
    for (let i = 0; i < sparkCount; i++) {
      if (state.sparks.length > 140) break;
      const a = Math.random() * Math.PI * 2;
      const spd = 55 + Math.random() * 195 * scale;
      state.sparks.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color: palette[i % palette.length],
        size: 1.8 + Math.random() * 2.2,
        life: 0.24 + Math.random() * 0.34
      });
    }
  }

  function spawnItem(x, y, kind) {
    const isMedal = kind === 'medal';
    state.items.push({
      kind,
      x: Math.max(24, Math.min(W - 24, x)),
      y: Math.max(44, y),
      vx: isMedal ? (Math.random() - 0.5) * 28 : (Math.random() < 0.5 ? -1 : 1) * 78,
      vy: isMedal ? 76 : -68,
      bounces: isMedal ? 0 : 5,
      spin: 0
    });
  }

  function collectItem(it) {
    const p = state.player;
    if (!p) return;

    if (it.kind === 'P') {
      if (p.power < 5) {
        p.power++;
        sound.powerUp(p.power === 5);
        const msg =
          p.power === 5
            ? 'MAX OVERDRIVE! 최종 기체 진화!'
            : p.power === 3
            ? 'AIRCRAFT EVOLVED + 윙맨 드론 합류!'
            : p.power === 4
            ? 'TWIN DRONES + 풀 아머 장착!'
            : `WEAPON UPGRADE LV.${p.power}!`;
        addScore(500, it.x, it.y, msg, p.power === 5 ? '#fde047' : '#38bdf8');
      } else {
        sound.powerUp(true);
        addScore(3000, it.x, it.y, 'MAX POWER BONUS +3,000!', '#fde047');
      }
    } else if (it.kind === 'B') {
      sound.powerUp(false);
      if (state.bombs < 5) {
        state.bombs++;
        addScore(500, it.x, it.y, '폭탄(편대폭격) +1!', '#fbbf24');
      } else {
        addScore(3000, it.x, it.y, '폭탄 MAX(5발) 보너스 +3,000!', '#fbbf24');
      }
    } else if (it.kind === 'S') {
      sound.powerUp(false);
      p.shield = true;
      addScore(500, it.x, it.y, 'ENERGY SHIELD ON!', '#22d3ee');
    } else if (it.kind === 'medal') {
      sound.medal();
      state.medals++;
      state.medalChain = Math.min(10, state.medalChain + 1);
      const pts = state.medalChain * 200;
      addScore(pts, it.x, it.y, `MEDAL +${pts}`, '#fde047');
    }
    updateHud();
  }

  function updateHud() {
    if (appShellEl) {
      appShellEl.classList.toggle('is-standby', state.mode === 'title');
    }
    scoreEl.textContent = state.score.toLocaleString();
    highScoreEl.textContent = state.highScore.toLocaleString();
    stageChipEl.textContent = `ROUND ${state.stage}`;

    livesRackEl.innerHTML = '';
    const shown = Math.max(0, state.lives - 1);
    for (let i = 0; i < shown; i++) {
      const span = document.createElement('span');
      span.className = 'life-wing';
      livesRackEl.appendChild(span);
    }

    const pw = state.player ? state.player.power : 1;
    powerTextEl.textContent = pw >= 5 ? 'MAX' : `LV.${pw}`;
    powerTextEl.classList.toggle('is-max', pw >= 5);

    const pips = powerPipsEl.querySelectorAll('.power-pip');
    pips.forEach((pip, idx) => {
      pip.classList.toggle('is-filled', idx < pw);
      pip.classList.toggle('is-max', pw >= 5);
    });

    bombCountEl.textContent = state.bombs >= 5 ? 'MAX' : String(state.bombs);
    btnHyperBomb.style.opacity = state.bombs > 0 && state.mode === 'playing' ? '1' : '0.42';

    if (btnFormation && formationLabelEl) {
      if (state.formationTime > 0) {
        btnFormation.classList.add('is-active');
        btnFormation.disabled = false;
        formationLabelEl.textContent = `편대 ${Math.ceil(state.formationTime)}s`;
      } else if (state.formationCd > 0) {
        btnFormation.classList.remove('is-active');
        btnFormation.disabled = true;
        formationLabelEl.textContent = `${Math.ceil(state.formationCd)}s`;
      } else {
        btnFormation.classList.remove('is-active');
        btnFormation.disabled = state.mode !== 'playing';
        formationLabelEl.textContent = '편대비행';
      }
    }
  }

  /* =========================================================================
   * 5. CALIBRATED PLAYER WEAPON SYSTEM + WINGMAN FORMATION SORTIE
   * ========================================================================= */
  function getDronePositions(p) {
    const bob = Math.sin(p.dronePhase * 4.5) * 4;
    const positions = [];

    // Permanent [P] LV.3+ Wingmen
    if (p.power === 3) {
      positions.push({ x: p.x - 42, y: p.y + 10 + bob });
    } else if (p.power >= 4) {
      positions.push(
        { x: p.x - 44, y: p.y + 10 + bob },
        { x: p.x + 44, y: p.y + 10 - bob }
      );
    }

    // Active [✈️ 편대비행] Tactical Escort Squadron (Summons 2 extra V-formation wingmen!)
    if (state.formationTime > 0) {
      if (positions.length === 0) {
        positions.push(
          { x: p.x - 44, y: p.y + 8 + bob, escort: true },
          { x: p.x + 44, y: p.y + 8 - bob, escort: true }
        );
      } else if (positions.length === 1) {
        positions.push(
          { x: p.x + 42, y: p.y + 10 - bob, escort: true },
          { x: p.x - 72, y: p.y + 22 - bob, escort: true }
        );
      } else {
        positions.push(
          { x: p.x - 74, y: p.y + 22 - bob, escort: true },
          { x: p.x + 74, y: p.y + 22 + bob, escort: true }
        );
      }
    }

    return positions;
  }

  function fireWeapons() {
    const p = state.player;
    if (!p) return;

    // 1. Primary Vulcan Stream (Gently tuned down ~25% so enemy planes visibly enter & engage, while Bombs feel huge!)
    if (p.mainCd <= 0) {
      p.mainCd = p.power >= 5 ? 0.10 : 0.112;
      p.muzzleFlash = 0.045;
      sound.vulcan(p.power);

      const speed = -800;
      const baseDmg = state.fighterType === 'skyray' ? 0.66 : 0.60;
      const addVulcan = (ox, oy, vx = 0, dmgScale = 1.0) => {
        state.bullets.push({
          kind: p.power >= 5 ? 'vulcanMax' : 'vulcan',
          x: p.x + ox,
          y: p.y + oy,
          vx,
          vy: speed,
          dmg: baseDmg * dmgScale,
          pierce: false
        });
      };

      if (p.power === 1) {
        addVulcan(-8, -26, 0, 1.12);
        addVulcan(8, -26, 0, 1.12);
      } else if (p.power === 2) {
        addVulcan(0, -30, 0, 1.0);
        addVulcan(-14, -20, -36, 0.84);
        addVulcan(14, -20, 36, 0.84);
      } else if (p.power === 3) {
        addVulcan(-7, -30, 0, 0.88);
        addVulcan(7, -30, 0, 0.88);
        addVulcan(-20, -18, -58, 0.75);
        addVulcan(20, -18, 58, 0.75);
      } else if (p.power === 4) {
        addVulcan(0, -32, 0, 0.88);
        addVulcan(-12, -26, -24, 0.76);
        addVulcan(12, -26, 24, 0.76);
        addVulcan(-24, -16, -78, 0.66);
        addVulcan(24, -16, 78, 0.66);
      } else {
        // LV.5 MAX OVERDRIVE 6-stream plasma vulcan
        addVulcan(-6, -34, 0, 0.82);
        addVulcan(6, -34, 0, 0.82);
        addVulcan(-16, -26, -38, 0.72);
        addVulcan(16, -26, 38, 0.72);
        addVulcan(-28, -16, -96, 0.62);
        addVulcan(28, -16, 96, 0.62);
      }

      // Autonomous & Tactical Formation Wingman Drones
      const drones = getDronePositions(p);
      drones.forEach((d) => {
        state.bullets.push({
          kind: d.escort || p.power >= 5 ? 'vulcanMax' : 'vulcan',
          x: d.x,
          y: d.y - 14,
          vx: 0,
          vy: -780,
          dmg: d.escort ? 0.48 : 0.42,
          pierce: false
        });
      });
    }

    // 2. Sub-Weapon System (LV.2+, smooth 2 -> 3 -> 4 projectile progression so LV.4 stays strong if hit!)
    if (p.power >= 2 && p.subCd <= 0) {
      const count = p.power >= 5 ? 4 : p.power === 4 ? 3 : 2;
      if (state.fighterType === 'lightning') {
        p.subCd = p.power >= 5 ? 0.48 : p.power >= 4 ? 0.52 : 0.65;
        sound.missileLaunch();
        const offsets = count === 4 ? [-30, -15, 15, 30] : count === 3 ? [-24, 0, 24] : [-20, 20];
        offsets.forEach((ox) => {
          state.bullets.push({
            kind: 'missile',
            x: p.x + ox,
            y: p.y - 6,
            vx: ox * 2.4,
            vy: -225,
            dmg: p.power >= 4 ? 1.56 : 1.30,
            smokeTick: 0
          });
        });
      } else if (state.fighterType === 'skyray') {
        p.subCd = p.power >= 5 ? 0.34 : p.power >= 4 ? 0.39 : 0.48;
        sound.laserBeam();
        const offsets = p.power >= 4 ? [-20, 20] : [0];
        offsets.forEach((ox) => {
          state.bullets.push({
            kind: 'laser',
            x: p.x + ox,
            y: p.y - 32,
            vx: 0,
            vy: -960,
            dmg: p.power >= 5 ? 1.80 : 1.55,
            pierce: true,
            hitSet: new Set()
          });
        });
      } else {
        // J7W Shinden Napalm Rockets
        p.subCd = p.power >= 5 ? 0.46 : p.power >= 4 ? 0.50 : 0.63;
        sound.missileLaunch();
        const offsets = count === 4 ? [-28, -14, 14, 28] : count === 3 ? [-22, 0, 22] : [-18, 18];
        offsets.forEach((ox) => {
          state.bullets.push({
            kind: 'rocket',
            x: p.x + ox,
            y: p.y - 10,
            vx: ox * 0.5,
            vy: -590,
            dmg: p.power >= 4 ? 1.68 : 1.44,
            aoe: true
          });
        });
      }
    }
  }

  function triggerFormationFlight(fromPartner = false) {
    if (state.mode !== 'playing' || !state.player) return;
    if (!fromPartner) {
      if (state.formationTime > 0) return;
      if (state.formationCd > 0) {
        addPopup(state.player.x, state.player.y - 32, `편대 재정비 중 (${Math.ceil(state.formationCd)}초)`, '#38bdf8');
        return;
      }
      state.formationCd = 12.0;
      if (coopState.active) coopSend({ type: 'p_event', ev: 'formation' });
    }

    state.formationTime = Math.max(state.formationTime, 7.0);
    sound.powerUp(true);
    state.shockwaves.push({ x: state.player.x, y: state.player.y, r: 10, maxR: 95, alpha: 0.9 });

    // Clear close-range enemy bullets on wingman arrival!
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
      const eb = state.enemyBullets[i];
      if (Math.hypot(eb.x - state.player.x, eb.y - state.player.y) < 110) {
        spawnExplosion(eb.x, eb.y, 0.3, 2);
        state.enemyBullets.splice(i, 1);
      }
    }

    showBanner(
      fromPartner ? '✈️ PARTNER FORMATION!' : '✈️ WINGMAN FORMATION!',
      '호위 편대기 7초간 합류 — 집중 지원사격 & 측면 방어!',
      false,
      1400
    );
    updateHud();
  }

  function triggerAirStrikeBomb(fromPartner = false) {
    if (state.mode !== 'playing' || !state.player) return;
    if (!fromPartner) {
      if (state.bombs <= 0) {
        sound.armorClink();
        addPopup(state.player.x, state.player.y - 32, '폭탄 없음! [B] 아이템으로 충전', '#fbbf24');
        return;
      }
      state.bombs--;
      if (coopState.active) coopSend({ type: 'p_event', ev: 'bomb' });
    }

    state.player.invuln = Math.max(state.player.invuln, 3.0);
    state.screenShake = 0.65;
    state.flashAlpha = 0.5;
    sound.airStrike();
    showBanner(
      fromPartner ? `💣 ${coopState.partner.callsign} 편대 폭격!` : '💣 B-29 편대 폭격 투하!',
      '적 탄막 전면 소거 & 보스·적군 초토화 폭격!',
      false,
      1550
    );

    if (state.enemyBullets.length > 0) {
      const cleared = state.enemyBullets.length;
      state.enemyBullets.forEach((eb) => spawnExplosion(eb.x, eb.y, 0.32, 2));
      state.enemyBullets = [];
      addScore(cleared * 50, state.player.x, state.player.y - 36, `탄막 제거 +${cleared * 50}!`, '#38bdf8');
    }

    // Works in BOTH normal waves AND Giant Boss battles!
    state.airStrikeBombers.push(
      { x: W * 0.5, y: H + 80, vy: -390, dropTick: 0, bossQuota: 75 },
      { x: W * 0.22, y: H + 150, vy: -390, dropTick: 0.07, bossQuota: 55 },
      { x: W * 0.78, y: H + 150, vy: -390, dropTick: 0.07, bossQuota: 55 }
    );
    updateHud();
  }

  /* =========================================================================
   * 6. SMOOTH PROGRESSIVE STAGE ESCALATION, MID-BOSSES & 3-PHASE BOSSES
   * ========================================================================= */
  function getStageHpScale(s) {
    // Matches player LV.1->LV.5 growth in R1-R3, then tapers smoothly (+0.15/round)
    // once player firepower plateaus at MAX so high-round enemies never feel spongy!
    const table = [0, 1.00, 1.46, 1.72, 1.90, 2.06, 2.22, 2.38, 2.53];
    const base = s < table.length ? table[s] : 2.53 + (s - 8) * 0.15;
    return coopState.active && coopState.partner.present ? base * 1.25 : base;
  }

  function spawnEnemyWave() {
    if (state.bossActive) return 0;

    state.waveStep++;
    const s = state.stage;
    const hpScale = getStageHpScale(s);
    const scoutVy = 126 + Math.min(56, (s - 1) * 9);

    // Stage 1-2: 10 waves before Boss; Stage 3+: 12 waves before Boss!
    const bossStep = s <= 2 ? 11 : 13;
    if (state.waveStep >= bossStep) {
      spawnStageBoss();
      return 0;
    }

    // Wave 6: Mid-Stage Vanguard (gives +0.95s breather afterwards so waves don't pile up)
    if (state.waveStep === 6) {
      showBanner('MID-STAGE VANGUARD', s === 1 ? '적 중형 폭격기 접근 — 파괴 시 파워업!' : '적 중장갑 전폭기 편대 저지선!', s >= 2, 1600);
      if (s === 1) {
        state.enemies.push({
          kind: 'gunship',
          x: W * 0.5,
          y: -58,
          vx: 22,
          vy: 56,
          hp: 20,
          maxHp: 20,
          shootCd: 1.25,
          dropsPower: true,
          score: 1200
        });
      } else {
        const dualHp = 15.5 * hpScale;
        [W * 0.27, W * 0.73].forEach((gx, idx) => {
          state.enemies.push({
            kind: 'gunship',
            x: gx,
            y: -60 - idx * 24,
            vx: idx === 0 ? 24 : -24,
            vy: 54 + Math.min(20, s * 2.5),
            hp: dualHp,
            maxHp: dualHp,
            shootCd: 1.15,
            dropsPower: idx === 0,
            dropsSpecial: idx === 1,
            score: 1800
          });
        });
        if (s >= 4) {
          const bHp = 22 * hpScale;
          state.enemies.push({
            kind: 'battleship',
            x: W * 0.5,
            y: -95,
            vx: 0,
            vy: 45,
            hp: bHp,
            maxHp: bHp,
            shootCd: 1.25,
            ground: true,
            score: 2200
          });
        }
      }
      return 0.95;
    }

    const pattern = state.waveStep % 5;
    if (pattern === 1) {
      // V-Squadron: staggered 3 (R1) -> 4 (R2) -> 5 (R3-R5) -> 6 (R6+)
      const count = s === 1 ? 3 : s === 2 ? 4 : s <= 5 ? 5 : 6;
      const cx = 78 + waveRand() * (W - 156);
      const mid = (count - 1) / 2;
      for (let i = 0; i < count; i++) {
        const off = i - mid;
        state.enemies.push({
          kind: 'scout',
          x: Math.max(26, Math.min(W - 26, cx + off * 35)),
          y: -26 - Math.abs(off) * 22,
          vx: s === 1 ? 0 : off * 10,
          vy: scoutVy,
          hp: 3.4 * hpScale,
          maxHp: 3.4 * hpScale,
          shootCd: Math.max(0.75, 1.9 - (s - 1) * 0.13) + waveRand() * 0.65,
          score: 180
        });
      }
    } else if (pattern === 2) {
      // Crimson Supply Squadron — Visibly sweeps across screen & drops [P] Power-Up!
      const fromLeft = waveRand() < 0.5;
      for (let i = 0; i < 4; i++) {
        state.enemies.push({
          kind: 'supply',
          x: fromLeft ? 44 + i * 38 : W - 44 - i * 38,
          y: -26 - i * 32,
          vx: fromLeft ? 40 : -40,
          vy: 120 + Math.min(48, (s - 1) * 8),
          hp: 4.4 * hpScale,
          maxHp: 4.4 * hpScale,
          shootCd: Math.max(0.8, 1.95 - (s - 1) * 0.13),
          dropsPower: i === 2,
          score: 300
        });
      }
    } else if (pattern === 3) {
      // Heavy Gunship + Staggered Escorts (2 in R1-R3 -> 3 in R4-R6 -> 4 in R7+)
      const gx = W * (0.28 + waveRand() * 0.44);
      const gHp = 20 * hpScale;
      state.enemies.push({
        kind: 'gunship',
        x: gx,
        y: -58,
        vx: s === 1 ? 0 : (waveRand() < 0.5 ? -1 : 1) * 20,
        vy: 54 + Math.min(20, (s - 1) * 2.8),
        hp: gHp,
        maxHp: gHp,
        shootCd: Math.max(0.95, 1.8 - (s - 1) * 0.11),
        dropsSpecial: waveRand() < 0.58,
        score: 1500
      });
      const escorts = s <= 3 ? [-48, 48] : s <= 6 ? [-52, 0, 52] : [-64, -32, 32, 64];
      escorts.forEach((ox, idx) => {
        state.enemies.push({
          kind: 'scout',
          x: Math.max(26, Math.min(W - 26, gx + ox)),
          y: -26 - (idx % 2) * 20,
          vx: 0,
          vy: scoutVy - 4,
          hp: 3.4 * hpScale,
          maxHp: 3.4 * hpScale,
          shootCd: Math.max(0.8, 1.85 - (s - 1) * 0.12),
          score: 180
        });
      });
    } else if (pattern === 4) {
      // Naval Battleship + Smoothly Staggered Flanking Scouts (2 -> 3 -> 3 -> 4 -> 4 -> 5 -> 5 -> 6)
      const bHp = 24 * hpScale;
      state.enemies.push({
        kind: 'battleship',
        x: 68 + waveRand() * (W - 136),
        y: -85,
        vx: 0,
        vy: 45,
        hp: bHp,
        maxHp: bHp,
        shootCd: Math.max(0.95, 1.85 - (s - 1) * 0.11),
        ground: true,
        score: 1900
      });
      const count = s === 1 ? 2 : Math.min(6, 2 + Math.floor(s / 2));
      for (let i = 0; i < count; i++) {
        state.enemies.push({
          kind: 'scout',
          x: i % 2 === 0 ? 38 : W - 38,
          y: -24 - i * 36,
          vx: i % 2 === 0 ? 50 : -50,
          vy: scoutVy + 4,
          hp: 3.4 * hpScale,
          maxHp: 3.4 * hpScale,
          shootCd: Math.max(0.75, 1.8 - (s - 1) * 0.12),
          score: 180
        });
      }
    } else {
      // Round 1: Single Gunship (20 HP); Round 2+: Dual Pincer Gunships (15 * hpScale each so pair isn't 2x spongy!)
      const positions = s === 1 ? [W * 0.5] : [W * 0.27, W * 0.73];
      const unitHp = (s === 1 ? 20 : 15) * hpScale;
      positions.forEach((gx, idx) => {
        state.enemies.push({
          kind: 'gunship',
          x: gx,
          y: -58 - idx * 32,
          vx: s === 1 ? 18 : idx === 0 ? 20 : -20,
          vy: 54 + Math.min(20, (s - 1) * 2.8),
          hp: unitHp,
          maxHp: unitHp,
          shootCd: Math.max(0.95, 1.8 - (s - 1) * 0.11),
          dropsSpecial: idx === 0,
          score: 1500
        });
      });
      return s >= 2 ? 0.35 : 0;
    }
    return 0;
  }

  function spawnStageBoss() {
    state.bossActive = true;
    sound.warningSiren();

    const bossIdx = (state.stage - 1) % 3;
    const bossDef = HD.bosses[bossIdx] || {
      name: 'XB-0 IRON VALKYRIE',
      w: 276,
      h: 130,
      turretOffsetX: 74,
      turretOffsetY: 8
    };
    const mkSuffix = state.stage > 3 ? ` MK.${Math.ceil(state.stage / 3)}` : '';
    const fullName = `${bossDef.name}${mkSuffix}`;

    showBanner('🚨 WARNING 🚨', `초거대 결전 요새 [${fullName}] 출현!`, true, 2700);

    // Smooth linear boss progression (~25s in R1 -> ~32s in R3 -> ~42s in R5 -> ~52s in R7; zero quadratic explosion!)
    const s = state.stage;
    const pwr = state.player ? state.player.power : 1;
    const coopMult = coopState.active && coopState.partner.present ? 1.45 : 1.0;
    const stageCoreBase = (370 + (s - 1) * 205) * coopMult;
    const coreHp = Math.round(stageCoreBase * (1 + (pwr - 1) * 0.05));
    const turretHp = Math.round((95 + (s - 1) * 58) * coopMult * (1 + (pwr - 1) * 0.04));

    state.boss = {
      bossIdx,
      name: fullName,
      w: bossDef.w,
      h: bossDef.h,
      txOff: bossDef.turretOffsetX,
      tyOff: bossDef.turretOffsetY,
      x: W / 2,
      y: -120,
      targetY: 122,
      vx: Math.min(96, 48 + (s - 1) * 6),
      hp: coreHp,
      maxHp: coreHp,
      leftTurretHp: turretHp,
      maxTurretHp: turretHp,
      rightTurretHp: turretHp,
      phase: 1,
      patternTimer: 1.45,
      spiralAngle: 0,
      hitFlash: 0,
      smokeTimer: 0
    };

    bossNameEl.textContent = `WARNING // ${fullName}`;
    bossHpPctEl.textContent = '100%';
    bossHpFillEl.style.width = '100%';
    bossHudEl.classList.add('is-active');
  }

  function damageEnemy(en, dmg, fromPartner = false) {
    en.hp -= dmg;
    en.hitFlash = 0.055;
    if (en.hp <= 0 && !en.dead) {
      en.dead = true;
      if (coopState.active && !fromPartner) {
        const idx = state.enemies.indexOf(en);
        if (idx >= 0) coopSend({ type: 'p_event', ev: 'enemy_kill', idx });
      }
      const isHeavy = en.kind === 'gunship' || en.kind === 'battleship';
      spawnExplosion(en.x, en.y, isHeavy ? 1.55 : 0.85, isHeavy ? 18 : 8, isHeavy);

      if (isHeavy) {
        sound.explodeBig();
        state.screenShake = Math.max(state.screenShake, 0.2);
        spawnItem(en.x - 14, en.y, 'medal');
        spawnItem(en.x + 14, en.y + 8, 'medal');
      } else {
        sound.explodeSmall();
        if (Math.random() < 0.28) spawnItem(en.x, en.y, 'medal');

        // Elite Revenge Bullet introduced gently from Round 6+ (6% -> 12% -> 18% -> 22% cap)
        const revChance = state.stage >= 6 ? Math.min(0.22, (state.stage - 5) * 0.06) : 0;
        if (revChance > 0 && state.player && Math.random() < revChance && en.y < H * 0.62) {
          const aim = Math.atan2(state.player.y - en.y, state.player.x - en.x);
          const spd = Math.min(255, 162 + state.stage * 9);
          state.enemyBullets.push({
            x: en.x,
            y: en.y,
            vx: Math.cos(aim) * spd,
            vy: Math.sin(aim) * spd,
            kind: 'amber'
          });
        }
      }

      if (en.dropsPower) {
        spawnItem(en.x, en.y, 'P');
      } else if (en.dropsSpecial) {
        spawnItem(en.x, en.y, Math.random() < 0.55 ? 'S' : 'B');
      }
      addScore(en.score, en.x, en.y);
    }
  }

  function damageBoss(dmg, hitX, hitY, ignoreArmor = false, fromPartner = false) {
    const b = state.boss;
    if (!b) return;
    b.hitFlash = 0.045;

    const lx = b.x - b.txOff;
    const rx = b.x + b.txOff;
    const ty = b.y + b.tyOff;

    // 1. Check Destructible Left & Right Heavy Wing Turrets first!
    if (!fromPartner && b.leftTurretHp > 0 && Math.abs(hitX - lx) < 36 && Math.abs(hitY - ty) < 40) {
      b.leftTurretHp -= dmg;
      if (b.leftTurretHp <= 0) {
        spawnExplosion(lx, ty, 1.8, 24, true);
        sound.explodeBig();
        state.screenShake = 0.35;
        spawnItem(lx, ty, 'medal');
        addScore(3000, lx, ty, 'LEFT CANNON DESTROYED!', '#38bdf8');
      }
      return;
    }

    if (!fromPartner && b.rightTurretHp > 0 && Math.abs(hitX - rx) < 36 && Math.abs(hitY - ty) < 40) {
      b.rightTurretHp -= dmg;
      if (b.rightTurretHp <= 0) {
        spawnExplosion(rx, ty, 1.8, 24, true);
        sound.explodeBig();
        state.screenShake = 0.35;
        spawnItem(rx, ty, 'medal');
        if (Math.random() < 0.75) spawnItem(rx, ty + 14, 'S');
        addScore(3000, rx, ty, 'RIGHT CANNON DESTROYED!', '#38bdf8');
      }
      return;
    }

    // 2. Gradual Core Armor Reduction while Wing Turrets live (78% in R1 -> 75% -> 72% -> 69% -> 66% floor)
    let effectiveDmg = dmg;
    if (!ignoreArmor && (b.leftTurretHp > 0 || b.rightTurretHp > 0)) {
      const fullArmor = Math.max(0.66, 0.78 - (state.stage - 1) * 0.03);
      const halfArmor = Math.max(0.82, 0.88 - (state.stage - 1) * 0.015);
      const armorRatio = b.leftTurretHp > 0 && b.rightTurretHp > 0 ? fullArmor : halfArmor;
      effectiveDmg = dmg * armorRatio;
      sound.armorClink();
    }

    b.hp -= effectiveDmg;
    const pct = Math.max(0, Math.ceil((b.hp / b.maxHp) * 100));
    bossHpPctEl.textContent = `${pct}%`;
    bossHpFillEl.style.width = `${pct}%`;

    // Phase 2 Transition at 65% HP!
    if (b.phase === 1 && b.hp <= b.maxHp * 0.65) {
      b.phase = 2;
      b.patternTimer = 0.8;
      state.screenShake = 0.42;
      spawnExplosion(b.x - 32, b.y, 1.5, 18, true);
      spawnExplosion(b.x + 32, b.y, 1.5, 18, false);
      sound.explodeBig();
      state.enemyBullets = [];
      showBanner('ARMOR SHATTERED!', '보스 2페이즈 돌입 — 회전 탄막 개방!', true, 1650);
    }

    // Phase 3 Transition at 30% HP (FINAL CORE MELTDOWN!)
    if (b.phase === 2 && b.hp <= b.maxHp * 0.30) {
      b.phase = 3;
      b.patternTimer = 0.7;
      state.screenShake = 0.52;
      state.flashAlpha = 0.35;
      spawnExplosion(b.x, b.y + 10, 2.0, 26, true);
      sound.explodeBig();
      state.enemyBullets = [];
      showBanner('CRITICAL OVERDRIVE!', '최종 3페이즈 코어 폭주!', true, 1750);
    }

    // Boss Defeated!
    if (b.hp <= 0) {
      const bx = b.x;
      const by = b.y;
      const clearedStage = state.stage;
      state.boss = null;
      state.bossActive = false;
      bossHudEl.classList.remove('is-active');
      state.enemyBullets = [];
      state.screenShake = 0.85;
      state.flashAlpha = 0.7;
      sound.explodeBig();
      spawnExplosion(bx, by, 2.4, 34, true);

      for (let k = 1; k <= 8; k++) {
        setTimeout(() => {
          spawnExplosion(
            bx + (Math.random() - 0.5) * 180,
            by + (Math.random() - 0.5) * 90,
            1.5 + Math.random() * 0.7,
            14,
            k % 3 === 0
          );
          sound.explodeSmall();
        }, k * 125);
      }

      for (let m = 0; m < 6; m++) {
        spawnItem(bx + (m - 2.5) * 24, by, 'medal');
      }
      spawnItem(bx - 22, by + 18, 'P');
      spawnItem(bx + 22, by + 18, 'B');

      const clearBonus = 15000 * clearedStage;
      addScore(clearBonus, bx, by, `ROUND ${clearedStage} CLEAR! +${clearBonus.toLocaleString()}`, '#fde047');

      state.stage++;
      state.waveStep = 0;
      state.waveTimer = 3.5;
      updateHud();
      submitOnlineScore();

      const nextBiomes = [
        '남태평양 산호초 요새 해역 — 난이도 상승!',
        '강철 협곡 해군 공창 돌입 — 적 화력 강화!',
        '심야 적색 폭풍 함대 진입 — 고난도 탄막 주의!'
      ];
      setTimeout(() => {
        if (state.mode === 'playing') {
          showBanner(`ROUND ${state.stage} START`, nextBiomes[(state.stage - 1) % 3], false, 2500);
        }
      }, 1900);
    }
  }

  function hitPlayer() {
    const p = state.player;
    if (!p || p.invuln > 0) return;

    state.medalChain = 0;

    if (p.shield) {
      p.shield = false;
      p.invuln = 2.2;
      spawnExplosion(p.x, p.y, 1.15, 16, true);
      sound.explodeSmall();
      addPopup(p.x, p.y - 26, 'SHIELD GUARD!', '#22d3ee');
      updateHud();
      return;
    }

    state.lives--;
    state.screenShake = 0.5;
    state.flashAlpha = 0.4;
    spawnExplosion(p.x, p.y, 1.9, 28, true);
    sound.explodeBig();

    if (state.lives <= 0) {
      state.mode = 'gameover';
      bossHudEl.classList.remove('is-active');
      updateHud();
      finalScoreEl.textContent = state.score.toLocaleString();
      finalStageEl.textContent = String(state.stage);
      finalMedalsEl.textContent = '집계 중...';
      gameoverMsgEl.textContent =
        state.score >= state.highScore && state.score > 0
          ? `🏆 ${pilotCallsign} 파일럿 최고 기록 달성! 실시간 랭킹에 등록되었습니다!`
          : `${pilotCallsign} 파일럿 수고하셨습니다! 실시간 랭킹에 기록이 반영되었습니다.`;
      submitOnlineScore();
      setTimeout(() => {
        if (state.mode === 'gameover') gameoverScreenEl.hidden = false;
      }, 800);
    } else {
      // Remember exact pre-death coordinates under the player's finger and respawn right there!
      const respawnX = Math.max(26, Math.min(W - 26, p.x));
      const respawnY = Math.max(58, Math.min(H - 38, p.y));
      // Forgiving recovery: only drop 1 power level & eject a [P] item right above respawn spot!
      if (p.power > 1) {
        p.power = Math.max(1, p.power - 1);
        spawnItem(respawnX, Math.max(66, respawnY - 88), 'P');
      }
      p.x = respawnX;
      p.y = respawnY;
      p.invuln = 3.2;
      addPopup(respawnX, Math.max(48, respawnY - 28), '제자리 부활!', '#fde047');
      updateHud();
    }
  }

  /* =========================================================================
   * 7. FULL 2D (360° OMNI-DIRECTIONAL) TOUCH SLIDE & KEYBOARD CONTROLS
   * ========================================================================= */
  const keys = { left: false, right: false, up: false, down: false, shoot: false };
  const pointer = { active: false, id: null, lastX: 0, lastY: 0 };

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = true;
    if (e.code === 'Space') {
      keys.shoot = true;
      sound.unlock();
    }
    if (e.code === 'KeyB' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') triggerAirStrikeBomb();
    if (e.code === 'KeyF' || e.code === 'KeyC') triggerFormationFlight();
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
    pointer.active = true;
    pointer.id = e.pointerId;
    pointer.lastX = e.clientX;
    pointer.lastY = e.clientY;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {}
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointer.active || e.pointerId !== pointer.id || state.mode !== 'playing' || !state.player) return;
    const dx = e.clientX - pointer.lastX;
    const dy = e.clientY - pointer.lastY;
    pointer.lastX = e.clientX;
    pointer.lastY = e.clientY;

    const sens = 1.24;
    state.player.x = Math.max(26, Math.min(W - 26, state.player.x + dx * sens));
    state.player.y = Math.max(58, Math.min(H - 38, state.player.y + dy * sens));
    state.player.bank = Math.max(-1, Math.min(1, dx * 0.16));
    state.player.thrust = dy < -0.5 ? 1 : dy > 0.5 ? -1 : 0;
  });

  function stopPointer(e) {
    if (e.pointerId === pointer.id) {
      pointer.active = false;
      pointer.id = null;
    }
  }
  canvas.addEventListener('pointerup', stopPointer);
  canvas.addEventListener('pointercancel', stopPointer);

  // Multi-Touch Safe Instant Button Trigger:
  // Fires immediately on pointerdown/touchstart even while another finger is sliding the fighter on #game-canvas!
  function bindInstantButton(el, fn) {
    if (!el) return;
    let lastStamp = 0;
    const invoke = (e) => {
      const now = performance.now();
      if (now - lastStamp < 260) return;
      lastStamp = now;
      if (e && e.cancelable) e.preventDefault();
      if (e) e.stopPropagation();
      sound.unlock();
      fn();
    };
    el.addEventListener('pointerdown', invoke);
    el.addEventListener('touchstart', invoke, { passive: false });
    el.addEventListener('click', (e) => {
      if (performance.now() - lastStamp < 350) return;
      invoke(e);
    });
  }

  bindInstantButton(btnAutoFire, () => {
    state.autoFire = !state.autoFire;
    btnAutoFire.setAttribute('aria-pressed', String(state.autoFire));
    btnAutoFire.textContent = state.autoFire ? '자동사격 켜짐' : '자동사격 꺼짐';
  });

  bindInstantButton(btnSound, () => {
    sound.enabled = !sound.enabled;
    btnSound.setAttribute('aria-pressed', String(sound.enabled));
    btnSound.textContent = sound.enabled ? '사운드 켜짐' : '사운드 꺼짐';
  });

  const toggleHandSide = () => {
    sound.medal();
    applyHandLayout(handLayout === 'left' ? 'right' : 'left', true);
  };
  bindInstantButton(btnHudSwapHand, toggleHandSide);
  bindInstantButton(btnStandbyHandLayout, toggleHandSide);
  bindInstantButton(btnHandLayout, toggleHandSide);

  bindInstantButton(btnPause, () => {
    if (state.mode === 'playing') pauseGame();
    else if (state.mode === 'paused') resumeGame();
  });

  bindInstantButton(btnFormation, () => {
    triggerFormationFlight(false);
  });

  bindInstantButton(btnHyperBomb, () => {
    triggerAirStrikeBomb(false);
  });

  // Auto-pause & notify 2P partner if user switches app or locks screen
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.mode === 'playing') {
      pauseGame();
    }
  });

  function startNewGame(isCoop = false) {
    resizeCanvas();
    coopState.active = Boolean(isCoop);
    if (coopState.active) {
      setWaveSeed(coopState.seed);
      coopState.partner.x = coopState.mySlot === 1 ? W * 0.68 : W * 0.32;
      coopState.partner.y = H - 84;
      coopState.partner.targetX = coopState.partner.x;
      coopState.partner.targetY = coopState.partner.y;
      coopState.partner.power = 1;
      coopState.partner.lives = 4;
      coopState.partner.aiMode = false;
      coopState.partner.aiReason = '';
      coopState.partner.lastPacketAt = performance.now();
      coopState.partner.aiWeavePhase = 0;
    }
    updateCoopHudBadge();

    state.score = 0;
    state.medals = 0;
    state.medalChain = 0;
    state.stage = 1;
    state.waveStep = 0;
    state.waveTimer = 1.0;
    state.bossActive = false;
    state.boss = null;
    state.lives = 4;
    state.bombs = 3;
    state.formationTime = 0;
    state.formationCd = 0;
    state.nextLifeScore = 50000;
    state.bullets = [];
    state.enemyBullets = [];
    state.enemies = [];
    state.items = [];
    state.explosions = [];
    state.shockwaves = [];
    state.sparks = [];
    state.popups = [];
    state.airStrikeBombers = [];
    state.player = createPlayer();
    if (coopState.active) {
      state.player.x = coopState.mySlot === 1 ? W * 0.32 : W * 0.68;
    }
    state.mode = 'playing';

    bossHudEl.classList.remove('is-active');
    startScreenEl.hidden = true;
    pauseScreenEl.hidden = true;
    gameoverScreenEl.hidden = true;
    installModalEl.hidden = true;
    rankingModalEl.hidden = true;
    coopModalEl.hidden = true;

    updateHud();
    if (coopState.active && coopState.partner.present) {
      showBanner('2P SQUADRON SORTIE!', `${pilotCallsign} & ${coopState.partner.callsign} 합동 편대 출격!`);
    } else {
      showBanner('ROUND 1 START', '워밍업 미션 — 적 보급편대의 [P]를 먹고 기체를 진화시켜라!');
    }
  }

  function openHangar() {
    state.mode = 'title';
    coopState.active = false;
    if (coopHudBadgeEl) coopHudBadgeEl.hidden = true;
    if (coopState.ws) {
      try {
        coopState.ws.close();
      } catch (_) {}
      coopState.ws = null;
    }
    state.boss = null;
    state.bossActive = false;
    state.enemies = [];
    state.bullets = [];
    state.enemyBullets = [];
    state.items = [];
    state.explosions = [];
    state.shockwaves = [];
    state.sparks = [];
    state.popups = [];
    state.airStrikeBombers = [];
    bossHudEl.classList.remove('is-active');
    waveBannerEl.classList.remove('is-visible');
    pauseScreenEl.hidden = true;
    gameoverScreenEl.hidden = true;
    rankingModalEl.hidden = true;
    coopModalEl.hidden = true;
    startScreenEl.hidden = false;
    updateHud();
    fetchLeaderboard('all');
  }

  function pauseGame() {
    if (state.mode !== 'playing') return;
    state.mode = 'paused';
    pauseScreenEl.hidden = false;
    if (coopState.active) {
      coopSend({ type: 'p_event', ev: 'pause', callsign: pilotCallsign });
    }
    updateHud();
  }

  function resumeGame() {
    if (state.mode !== 'paused') return;
    state.mode = 'playing';
    pauseScreenEl.hidden = true;
    lastTime = performance.now();
    if (coopState.active) {
      coopSend({ type: 'p_event', ev: 'resume', callsign: pilotCallsign });
    }
    updateHud();
  }

  btnStartGame.addEventListener('click', () => {
    sound.unlock();
    startNewGame(false);
  });
  btnRetryGame.addEventListener('click', () => {
    sound.unlock();
    if (coopState.active && coopState.ws && coopState.ws.readyState === 1 && coopState.partner.aiReason !== 'left') {
      coopSend({ type: 'start_coop' });
    } else {
      startNewGame(coopState.active);
    }
  });
  btnBackHangar.addEventListener('click', () => openHangar());
  btnRestartPause.addEventListener('click', () => openHangar());
  btnResumeGame.addEventListener('click', () => resumeGame());

  /* =========================================================================
   * 8. MAIN UPDATE LOOP
   * ========================================================================= */
  function findNearestTarget(x, y) {
    let best = null;
    let bestDist = Infinity;
    for (let i = 0; i < state.enemies.length; i++) {
      const en = state.enemies[i];
      // Only lock onto enemies that have visibly entered the screen!
      if (en.y < 24) continue;
      const d = Math.hypot(en.x - x, en.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = en;
      }
    }
    if (state.boss && state.boss.y >= 20) {
      const bs = state.boss;
      const pts = [{ x: bs.x, y: bs.y }];
      if (bs.leftTurretHp > 0) pts.push({ x: bs.x - bs.txOff, y: bs.y + bs.tyOff });
      if (bs.rightTurretHp > 0) pts.push({ x: bs.x + bs.txOff, y: bs.y + bs.tyOff });
      pts.forEach((pt) => {
        const bd = Math.hypot(pt.x - x, pt.y - y);
        if (bd < bestDist) {
          bestDist = bd;
          best = pt;
        }
      });
    }
    return best;
  }

  function update(dt) {
    // Scroll HD Aerial Terrain Map continuously
    state.terrainScroll += 78 * dt;
    state.clouds.forEach((cl) => {
      cl.y += cl.speed * dt;
      if (cl.y > H + 110) {
        cl.y = -110;
        cl.x = Math.random() * W;
      }
    });

    if (state.mode !== 'playing') return;

    if (state.screenShake > 0) state.screenShake = Math.max(0, state.screenShake - dt * 1.3);
    if (state.flashAlpha > 0) state.flashAlpha = Math.max(0, state.flashAlpha - dt * 1.9);

    // Wingman Formation Timers
    if (state.formationTime > 0) {
      const prevSec = Math.ceil(state.formationTime);
      state.formationTime = Math.max(0, state.formationTime - dt);
      if (Math.ceil(state.formationTime) !== prevSec) updateHud();
    } else if (state.formationCd > 0) {
      const prevCd = Math.ceil(state.formationCd);
      state.formationCd = Math.max(0, state.formationCd - dt);
      if (Math.ceil(state.formationCd) !== prevCd) updateHud();
    }

    const p = state.player;
    if (p) {
      p.dronePhase += dt;
      if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);
      if (p.mainCd > 0) p.mainCd -= dt;
      if (p.subCd > 0) p.subCd -= dt;
      if (p.muzzleFlash > 0) p.muzzleFlash = Math.max(0, p.muzzleFlash - dt);

      const mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      const my = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      if (mx !== 0 || my !== 0) {
        const len = Math.hypot(mx, my) || 1;
        const baseSpd = state.fighterType === 'shinden' ? 365 : 320;
        p.x = Math.max(26, Math.min(W - 26, p.x + (mx / len) * baseSpd * dt));
        p.y = Math.max(58, Math.min(H - 38, p.y + (my / len) * baseSpd * dt));
        p.bank += (mx - p.bank) * Math.min(1, 12 * dt);
        p.thrust = my < 0 ? 1 : my > 0 ? -1 : 0;
      } else if (!pointer.active) {
        p.bank += (0 - p.bank) * Math.min(1, 10 * dt);
        p.thrust = 0;
      }

      if (state.autoFire || keys.shoot) {
        fireWeapons();
      }

      // 2-Player Co-op: Broadcast our live position/status (~20Hz) & run Partner / AI Autopilot fighter!
      if (coopState.active) {
        coopState.syncTimer -= dt;
        if (coopState.syncTimer <= 0) {
          coopState.syncTimer = 0.05;
          coopSend({
            type: 'p_state',
            nx: Number((p.x / W).toFixed(3)),
            ny: Number((p.y / H).toFixed(3)),
            bank: Number(p.bank.toFixed(2)),
            power: p.power,
            lives: state.lives,
            shield: p.shield,
            fighter: state.fighterType,
            callsign: pilotCallsign,
            score: state.score
          });
        }
        const pt = coopState.partner;
        if (pt.present && pt.lives > 0) {
          // Heartbeat timeout check: if partner hasn't sent a packet for 3.6s (backgrounded/frozen), switch to AI Autopilot!
          if (!pt.aiMode && pt.lastPacketAt > 0 && performance.now() - pt.lastPacketAt > 3600) {
            switchPartnerToAi('pause');
          }

          if (pt.aiMode) {
            pt.aiWeavePhase = (pt.aiWeavePhase || 0) + dt;
            pt.power = Math.max(pt.power || 1, Math.min(5, Math.ceil(state.stage / 2) + 1));

            // 1) Tactical Target Acquisition (Boss -> Nearest Visible Enemy -> Flank Formation)
            let desiredX = (p.x < W * 0.5 ? W * 0.68 : W * 0.32) + Math.sin(pt.aiWeavePhase * 1.9) * 38;
            let desiredY = H - 96 + Math.cos(pt.aiWeavePhase * 1.6) * 24;

            const aiTarget = findNearestTarget(pt.x, pt.y);
            if (aiTarget) {
              const flankOffset = p.x < aiTarget.x ? 34 : -34;
              desiredX = aiTarget.x + flankOffset + Math.sin(pt.aiWeavePhase * 2.5) * 26;
            }

            // 2) Active Enemy Bullet Evasion Vector
            let dodgeX = 0;
            let dodgeY = 0;
            for (let bi = 0; bi < state.enemyBullets.length; bi++) {
              const eb = state.enemyBullets[bi];
              const dx = pt.x - eb.x;
              const dy = pt.y - eb.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 0 && dist < 76 && dy > -18) {
                const push = ((76 - dist) / 76) * 115;
                dodgeX += (dx >= 0 ? 1 : -1) * push;
                dodgeY += (dy >= 0 ? 0.5 : -0.5) * push;
              }
            }

            pt.targetX = Math.max(30, Math.min(W - 30, desiredX + dodgeX));
            pt.targetY = Math.max(H * 0.56, Math.min(H - 52, desiredY + dodgeY));
            const moveDeltaX = pt.targetX - pt.x;
            pt.bank += (Math.max(-1, Math.min(1, moveDeltaX * 0.04)) - pt.bank) * Math.min(1, 10 * dt);
            pt.x += moveDeltaX * Math.min(1, 7.5 * dt);
            pt.y += (pt.targetY - pt.y) * Math.min(1, 7.5 * dt);
          } else {
            pt.x += (pt.targetX - pt.x) * Math.min(1, 16 * dt);
            pt.y += (pt.targetY - pt.y) * Math.min(1, 16 * dt);
          }

          pt.fireCd -= dt;
          if (pt.fireCd <= 0) {
            const pw = Math.max(1, Math.min(5, pt.power || 1));
            pt.fireCd = pw >= 5 ? 0.105 : 0.118;
            const pType = pt.fighter || 'skyray';
            const baseDmg = pType === 'skyray' ? 0.66 : 0.60;
            const kind = pw >= 5 ? 'vulcanMax' : 'vulcan';
            const addPartnerVulcan = (ox, oy, vx = 0, dmgScale = 1.0) => {
              state.bullets.push({
                kind,
                x: pt.x + ox,
                y: pt.y + oy,
                vx,
                vy: -800,
                dmg: baseDmg * dmgScale,
                pierce: false
              });
            };

            if (pw === 1) {
              addPartnerVulcan(-8, -26, 0, 1.12);
              addPartnerVulcan(8, -26, 0, 1.12);
            } else if (pw === 2) {
              addPartnerVulcan(0, -30, 0, 1.0);
              addPartnerVulcan(-14, -20, -36, 0.84);
              addPartnerVulcan(14, -20, 36, 0.84);
            } else if (pw === 3) {
              addPartnerVulcan(-7, -30, 0, 0.88);
              addPartnerVulcan(7, -30, 0, 0.88);
              addPartnerVulcan(-20, -18, -58, 0.75);
              addPartnerVulcan(20, -18, 58, 0.75);
            } else if (pw === 4) {
              addPartnerVulcan(0, -32, 0, 0.88);
              addPartnerVulcan(-12, -26, -24, 0.76);
              addPartnerVulcan(12, -26, 24, 0.76);
              addPartnerVulcan(-24, -16, -78, 0.66);
              addPartnerVulcan(24, -16, 78, 0.66);
            } else {
              addPartnerVulcan(-6, -34, 0, 0.82);
              addPartnerVulcan(6, -34, 0, 0.82);
              addPartnerVulcan(-16, -26, -38, 0.72);
              addPartnerVulcan(16, -26, 38, 0.72);
              addPartnerVulcan(-28, -16, -96, 0.62);
              addPartnerVulcan(28, -16, 96, 0.62);
            }

            // Partner LV.3+ Wingman Drones also fire!
            if (pw === 3) {
              addPartnerVulcan(-42, -4, 0, 0.7);
            } else if (pw >= 4) {
              addPartnerVulcan(-44, -4, 0, 0.7);
              addPartnerVulcan(44, -4, 0, 0.7);
            }
          }

          // Partner / AI Fighter-Specific Sub-Weapon Evolution (LV.2 ~ LV.5: Missiles / Twin Lasers / Napalm Rockets!)
          pt.missileCd = (pt.missileCd || 0) - dt;
          const pwSub = Math.max(1, Math.min(5, pt.power || 1));
          if (pt.missileCd <= 0 && pwSub >= 2) {
            const pType = pt.fighter || 'skyray';
            const count = pwSub >= 5 ? 4 : pwSub === 4 ? 3 : 2;
            if (pType === 'lightning') {
              pt.missileCd = pwSub >= 5 ? 0.48 : pwSub >= 4 ? 0.52 : 0.65;
              const offsets = count === 4 ? [-30, -15, 15, 30] : count === 3 ? [-24, 0, 24] : [-20, 20];
              offsets.forEach((ox) => {
                state.bullets.push({
                  kind: 'missile',
                  x: pt.x + ox,
                  y: pt.y - 6,
                  vx: ox * 2.4,
                  vy: -225,
                  dmg: pwSub >= 4 ? 1.56 : 1.30,
                  smokeTick: 0
                });
              });
            } else if (pType === 'skyray') {
              pt.missileCd = pwSub >= 5 ? 0.34 : pwSub >= 4 ? 0.39 : 0.48;
              const offsets = pwSub >= 4 ? [-20, 20] : [0];
              offsets.forEach((ox) => {
                state.bullets.push({
                  kind: 'laser',
                  x: pt.x + ox,
                  y: pt.y - 32,
                  vx: 0,
                  vy: -960,
                  dmg: pwSub >= 5 ? 1.80 : 1.55,
                  pierce: true,
                  hitSet: new Set()
                });
              });
            } else {
              pt.missileCd = pwSub >= 5 ? 0.46 : pwSub >= 4 ? 0.50 : 0.63;
              const offsets = count === 4 ? [-28, -14, 14, 28] : count === 3 ? [-22, 0, 22] : [-18, 18];
              offsets.forEach((ox) => {
                state.bullets.push({
                  kind: 'rocket',
                  x: pt.x + ox,
                  y: pt.y - 10,
                  vx: ox * 0.5,
                  vy: -590,
                  dmg: pwSub >= 4 ? 1.68 : 1.44,
                  aoe: true
                });
              });
            }
          }
        }
      }
    }

    // Allied B-29 Air-Strike Bombers (Works on BOTH enemy waves AND Giant Stage Bosses!)
    for (let i = state.airStrikeBombers.length - 1; i >= 0; i--) {
      const bm = state.airStrikeBombers[i];
      bm.y += bm.vy * dt;
      bm.dropTick -= dt;
      if (bm.dropTick <= 0 && bm.y > 0 && bm.y < H) {
        bm.dropTick = 0.095;
        spawnExplosion(bm.x + (Math.random() - 0.5) * 95, bm.y - 45, 1.25, 5);
        state.enemyBullets = [];
        state.enemies.forEach((en) => {
          if (en.y >= 10) damageEnemy(en, 11.0);
        });
        if (state.boss && bm.bossQuota > 0) {
          const bs = state.boss;
          const strike = Math.min(bm.bossQuota, 12);
          bm.bossQuota -= strike;
          spawnExplosion(bs.x + (Math.random() - 0.5) * 140, bs.y + (Math.random() - 0.5) * 44, 1.45, 8, true);
          // Carpet bombs blast both Wing Turrets and Boss Core!
          if (bs.leftTurretHp > 0) {
            bs.leftTurretHp -= strike * 0.55;
            if (bs.leftTurretHp <= 0) {
              spawnExplosion(bs.x - bs.txOff, bs.y + bs.tyOff, 1.8, 20, true);
              addScore(3000, bs.x - bs.txOff, bs.y + bs.tyOff, 'LEFT CANNON DESTROYED!', '#38bdf8');
            }
          }
          if (bs.rightTurretHp > 0) {
            bs.rightTurretHp -= strike * 0.55;
            if (bs.rightTurretHp <= 0) {
              spawnExplosion(bs.x + bs.txOff, bs.y + bs.tyOff, 1.8, 20, true);
              addScore(3000, bs.x + bs.txOff, bs.y + bs.tyOff, 'RIGHT CANNON DESTROYED!', '#38bdf8');
            }
          }
          damageBoss(strike, bs.x, bs.y, true);
        }
      }
      if (bm.y < -160) state.airStrikeBombers.splice(i, 1);
    }

    // Wave Spawner (Smooth -0.08s step per round + extra breather after Mid-Stage/Dual-Gunship waves)
    if (!state.bossActive) {
      state.waveTimer -= dt;
      if (state.waveTimer <= 0) {
        const breather = spawnEnemyWave() || 0;
        state.waveTimer = Math.max(2.05, 2.72 - (state.stage - 1) * 0.08) + breather;
      }
    }

    // Player Projectiles
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
          const nextAng = cur + Math.max(-6.0 * dt, Math.min(6.0 * dt, diff));
          const spd = 510;
          b.vx = Math.cos(nextAng) * spd;
          b.vy = Math.sin(nextAng) * spd;
        } else {
          b.vy = Math.max(-540, b.vy - 620 * dt);
        }
        b.smokeTick -= dt;
        if (b.smokeTick <= 0 && state.sparks.length < 95) {
          b.smokeTick = 0.038;
          state.sparks.push({
            x: b.x,
            y: b.y + 8,
            vx: (Math.random() - 0.5) * 14,
            vy: 35,
            color: 'rgba(226, 232, 240, 0.55)',
            size: 2.2,
            life: 0.19
          });
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Despawn cleanly at top edge so off-screen enemies aren't sniped before appearing!
      if (b.y < -6 || b.y > H + 40 || b.x < -40 || b.x > W + 40) {
        state.bullets.splice(i, 1);
        continue;
      }

      let consumed = false;

      // Hit Enemies (Only once enemy plane has visibly entered the screen: en.y >= 24!)
      for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
        const en = state.enemies[ei];
        if (en.y < 24) continue;
        const hitR = en.kind === 'gunship' ? 42 : en.kind === 'battleship' ? 28 : 23;
        if (Math.abs(b.x - en.x) < hitR && Math.abs(b.y - en.y) < hitR) {
          if (b.pierce) {
            if (b.hitSet.has(en)) continue;
            b.hitSet.add(en);
          }
          if (b.aoe) {
            spawnExplosion(b.x, b.y, 1.05, 8);
            state.enemies.forEach((other) => {
              if (other !== en && other.y >= 24 && Math.hypot(other.x - b.x, other.y - b.y) < 68) {
                damageEnemy(other, b.dmg * 0.6);
              }
            });
          }
          damageEnemy(en, b.dmg);
          if (!b.pierce) {
            consumed = true;
            break;
          }
        }
      }

      // Hit Giant Boss (Only once visible on screen!)
      if (!consumed && state.boss && state.boss.y >= 12) {
        const bs = state.boss;
        if (Math.abs(b.x - bs.x) < bs.w * 0.44 && Math.abs(b.y - bs.y) < bs.h * 0.36) {
          if (!b.pierce || !b.hitSet.has(bs)) {
            if (b.pierce) b.hitSet.add(bs);
            if (b.aoe) spawnExplosion(b.x, b.y, 0.9, 6);
            damageBoss(b.dmg, b.x, b.y);
            if (!b.pierce) consumed = true;
          }
        }
      }

      if (consumed) state.bullets.splice(i, 1);
    }

    // Enemies Update & Stage-Scaled Bullet Patterns
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const en = state.enemies[i];
      if (en.dead) {
        state.enemies.splice(i, 1);
        continue;
      }
      if (en.hitFlash > 0) en.hitFlash -= dt;

      en.x += en.vx * dt;
      en.y += en.vy * dt;
      if ((en.x < 28 && en.vx < 0) || (en.x > W - 28 && en.vx > 0)) en.vx *= -1;

      if (en.y > H + 120) {
        state.enemies.splice(i, 1);
        continue;
      }

      // Damaged smoke trail on heavy gunships/battleships
      if ((en.kind === 'gunship' || en.kind === 'battleship') && en.hp < en.maxHp * 0.5 && Math.random() < 18 * dt) {
        state.sparks.push({
          x: en.x + (Math.random() - 0.5) * 24,
          y: en.y - 6,
          vx: (Math.random() - 0.5) * 18,
          vy: -36,
          color: 'rgba(148, 163, 184, 0.45)',
          size: 3.5,
          life: 0.35
        });
      }

      // Progressive Enemy Fire (Smooth step-by-step escalation across rounds)
      en.shootCd -= dt;
      if (en.shootCd <= 0 && en.y > 24 && en.y < H - 145 && p) {
        const aim = Math.atan2(p.y - en.y, p.x - en.x);
        const spd = Math.min(295, 136 + (state.stage - 1) * 18);

        if (en.kind === 'gunship') {
          en.shootCd = Math.max(1.1, 1.95 - (state.stage - 1) * 0.11);
          const spread =
            state.stage >= 6
              ? [-0.30, -0.10, 0.10, 0.30]
              : state.stage >= 3
              ? [-0.22, 0, 0.22]
              : [-0.15, 0.15];
          spread.forEach((off, idx) => {
            state.enemyBullets.push({
              x: en.x,
              y: en.y + 28,
              vx: Math.cos(aim + off) * spd,
              vy: Math.sin(aim + off) * spd,
              kind: idx % 2 === 0 ? 'amber' : 'red'
            });
          });
        } else if (en.kind === 'battleship') {
          en.shootCd = Math.max(1.15, 2.05 - (state.stage - 1) * 0.11);
          const count = state.stage === 1 ? 1 : state.stage <= 3 ? 2 : state.stage <= 6 ? 3 : 4;
          for (let k = 0; k < count; k++) {
            const off = count === 1 ? 0 : (k - (count - 1) / 2) * 0.20;
            state.enemyBullets.push({
              x: en.x,
              y: en.y + 16,
              vx: Math.cos(aim + off) * (spd * 0.94),
              vy: Math.sin(aim + off) * (spd * 0.94),
              kind: 'amber'
            });
          }
        } else {
          en.shootCd = Math.max(1.15, 2.35 - (state.stage - 1) * 0.14) + Math.random() * 0.6;
          if (state.stage >= 4 && en.kind === 'supply') {
            [-0.13, 0.13].forEach((off) => {
              state.enemyBullets.push({
                x: en.x,
                y: en.y + 18,
                vx: Math.cos(aim + off) * spd,
                vy: Math.sin(aim + off) * spd,
                kind: 'red'
              });
            });
          } else {
            state.enemyBullets.push({
              x: en.x,
              y: en.y + 18,
              vx: Math.cos(aim) * spd,
              vy: Math.sin(aim) * spd,
              kind: 'red'
            });
          }
        }
      }

      // Air-to-air collision
      if (!en.ground && p && p.invuln <= 0) {
        if (Math.abs(en.x - p.x) < 22 && Math.abs(en.y - p.y) < 22) {
          damageEnemy(en, 18);
          hitPlayer();
        }
      }
    }

    // Giant 3-Phase Boss Update & Round-Scaled Patterns!
    if (state.boss) {
      const bs = state.boss;
      if (bs.hitFlash > 0) bs.hitFlash -= dt;

      if (bs.y < bs.targetY) {
        bs.y += 82 * dt;
      } else {
        const spdMult = bs.phase === 3 ? 1.25 : bs.phase === 2 ? 1.10 : 1.0;
        bs.x += bs.vx * spdMult * dt;
        const margin = Math.min(115, W * 0.28);
        if ((bs.x < margin && bs.vx < 0) || (bs.x > W - margin && bs.vx > 0)) bs.vx *= -1;
      }

      // Smoke & fire sparks in Phase 2 / 3
      if (bs.phase >= 2) {
        bs.smokeTimer -= dt;
        if (bs.smokeTimer <= 0) {
          bs.smokeTimer = bs.phase === 3 ? 0.06 : 0.12;
          state.sparks.push({
            x: bs.x + (Math.random() - 0.5) * 90,
            y: bs.y + (Math.random() - 0.5) * 35,
            vx: (Math.random() - 0.5) * 30,
            vy: -45,
            color: bs.phase === 3 ? '#fb923c' : 'rgba(148,163,184,0.55)',
            size: 4,
            life: 0.42
          });
        }
      }

      bs.patternTimer -= dt;
      if (bs.patternTimer <= 0 && p && bs.y >= bs.targetY - 15) {
        const baseSpd = Math.min(285, 138 + (state.stage - 1) * 16 + (bs.phase - 1) * 15);

        // Active Wing Turrets: 1-way in R1-R2 -> 2-way in R3-R5 -> 3-way in R6+
        const fireTurret = (tx, ty) => {
          const a = Math.atan2(p.y - ty, p.x - tx);
          const offs =
            state.stage >= 6 ? [-0.14, 0, 0.14] : state.stage >= 3 ? [-0.09, 0.09] : [0];
          offs.forEach((o) => {
            state.enemyBullets.push({
              x: tx,
              y: ty + 16,
              vx: Math.cos(a + o) * baseSpd,
              vy: Math.sin(a + o) * baseSpd,
              kind: 'amber'
            });
          });
        };
        if (bs.leftTurretHp > 0) fireTurret(bs.x - bs.txOff, bs.y + bs.tyOff);
        if (bs.rightTurretHp > 0) fireTurret(bs.x + bs.txOff, bs.y + bs.tyOff);

        if (bs.phase === 1) {
          // Phase 1: Sweeping Fan Curtain (4-way in R1 -> smooth +1 every ~1.5 rounds up to 8-way)
          const count = 3 + Math.min(5, Math.ceil(state.stage * 0.75));
          const spread = 1.12;
          const aim = Math.atan2(p.y - bs.y, p.x - bs.x);
          for (let k = 0; k < count; k++) {
            const ang = aim - spread / 2 + (spread * k) / (count - 1);
            state.enemyBullets.push({
              x: bs.x,
              y: bs.y + 26,
              vx: Math.cos(ang) * (baseSpd * 0.92),
              vy: Math.sin(ang) * (baseSpd * 0.92),
              kind: k % 2 === 0 ? 'purple' : 'red'
            });
          }
          bs.patternTimer = Math.max(0.95, 1.58 - (state.stage - 1) * 0.08);
        } else if (bs.phase === 2) {
          // Phase 2: Rotating Spiral Streams (5 arms in R1-2 -> 6 in R3-4 -> 7 in R5-6 -> up to 9)
          bs.spiralAngle += 0.40;
          const arms = 4 + Math.min(5, Math.ceil(state.stage * 0.6));
          for (let k = 0; k < arms; k++) {
            const ang = bs.spiralAngle + (Math.PI * 2 * k) / arms;
            state.enemyBullets.push({
              x: bs.x,
              y: bs.y + 18,
              vx: Math.cos(ang) * (baseSpd * 0.85),
              vy: Math.sin(ang) * (baseSpd * 0.85),
              kind: 'purple'
            });
          }
          if (state.stage >= 2 && Math.floor(bs.spiralAngle * 2) % 2 === 0) {
            const aim = Math.atan2(p.y - bs.y, p.x - bs.x);
            const lanceOffs = state.stage >= 5 ? [-0.12, 0, 0.12] : [-0.08, 0.08];
            lanceOffs.forEach((o) => {
              state.enemyBullets.push({
                x: bs.x,
                y: bs.y + 28,
                vx: Math.cos(aim + o) * (baseSpd * 1.05),
                vy: Math.sin(aim + o) * (baseSpd * 1.05),
                kind: 'red'
              });
            });
          }
          bs.patternTimer = Math.max(0.50, 0.86 - (state.stage - 1) * 0.045);
        } else {
          // Phase 3 (FINAL OVERDRIVE): 8-way ring in R1 -> smooth +1 per round up to 14-way
          bs.spiralAngle -= 0.45;
          const ringCount = 6 + Math.min(8, state.stage + 1);
          for (let k = 0; k < ringCount; k++) {
            const ang = bs.spiralAngle + (Math.PI * 2 * k) / ringCount;
            const spd = k % 2 === 0 ? baseSpd * 0.92 : baseSpd * 0.74;
            state.enemyBullets.push({
              x: bs.x,
              y: bs.y + 20,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              kind: k % 2 === 0 ? 'purple' : 'amber'
            });
          }
          bs.patternTimer = Math.max(0.52, 0.86 - (state.stage - 1) * 0.045);
        }
      }

      if (p && p.invuln <= 0 && Math.abs(p.x - bs.x) < bs.w * 0.34 && Math.abs(p.y - bs.y) < bs.h * 0.28) {
        hitPlayer();
      }
    }

    // Enemy Bullets (Classic 1945 6.0px cockpit hitbox + Escort Wingman Flank Guard!)
    const activeDrones = p && state.formationTime > 0 ? getDronePositions(p) : [];
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
      const eb = state.enemyBullets[i];
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;
      if (eb.x < -24 || eb.x > W + 24 || eb.y < -24 || eb.y > H + 24) {
        state.enemyBullets.splice(i, 1);
        continue;
      }
      if (activeDrones.length > 0) {
        let blocked = false;
        for (let di = 0; di < activeDrones.length; di++) {
          const dr = activeDrones[di];
          if (dr.escort && Math.hypot(eb.x - dr.x, eb.y - dr.y) < 16) {
            spawnExplosion(eb.x, eb.y, 0.28, 2);
            state.enemyBullets.splice(i, 1);
            blocked = true;
            break;
          }
        }
        if (blocked) continue;
      }
      if (p && p.invuln <= 0 && Math.hypot(eb.x - p.x, eb.y - p.y) < 6.0) {
        state.enemyBullets.splice(i, 1);
        hitPlayer();
      }
    }

    // Items & Magnetic Pickup
    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.spin += dt * 6.0;

      if (p) {
        const dist = Math.hypot(p.x - it.x, p.y - it.y);
        if (dist < 27) {
          state.items.splice(i, 1);
          collectItem(it);
          continue;
        }
        if (dist < 88) {
          it.x += ((p.x - it.x) / dist) * 280 * dt;
          it.y += ((p.y - it.y) / dist) * 280 * dt;
        }
      }

      it.x += it.vx * dt;
      it.y += it.vy * dt;

      if (it.bounces > 0) {
        if (it.x < 22 || it.x > W - 22) {
          it.vx *= -1;
          it.x = Math.max(22, Math.min(W - 22, it.x));
          it.bounces--;
        }
        if (it.y < 54 || (it.y > H - 48 && it.vy > 0)) {
          it.vy *= -1;
          it.y = Math.max(54, Math.min(H - 48, it.y));
          it.bounces--;
        }
      } else if (it.y > H + 40) {
        state.items.splice(i, 1);
      }
    }

    // Explosions, Shockwaves, Sparks, Popups
    for (let i = state.explosions.length - 1; i >= 0; i--) {
      const ex = state.explosions[i];
      ex.frame += ex.speed * dt;
      if (ex.frame >= 12) state.explosions.splice(i, 1);
    }

    for (let i = state.shockwaves.length - 1; i >= 0; i--) {
      const sw = state.shockwaves[i];
      sw.r += (sw.maxR - sw.r) * Math.min(1, 9 * dt) + 80 * dt;
      sw.alpha -= dt * 2.2;
      if (sw.alpha <= 0 || sw.r >= sw.maxR) state.shockwaves.splice(i, 1);
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
      pp.y -= 38 * dt;
      pp.life -= dt;
      if (pp.life <= 0) state.popups.splice(i, 1);
    }
  }

  /* =========================================================================
   * 9. REMASTERED HD HARDWARE RENDERER (Locked 60 FPS on Galaxy A-Series)
   * ========================================================================= */
  function render() {
    ctx.save();

    if (state.screenShake > 0) {
      const m = state.screenShake * 14;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }

    // 1. Seamless HD Pre-Rendered Aerial Terrain Map (Changes Biome per Stage!)
    if (HD.ready) {
      const biomeIdx = (state.stage - 1) % 3;
      const terrainImg = biomeIdx === 1 ? HD.terrains.fortress : HD.terrains.pacific;
      const drawW = W;
      const drawH = Math.round(W * (terrainImg.height / terrainImg.width));
      const offset = state.terrainScroll % drawH;
      for (let y = offset - drawH; y < H; y += drawH) {
        ctx.drawImage(terrainImg, 0, y, drawW, drawH + 1);
      }

      // Stage 3/6/9 Crimson Dusk / Night Storm Tactical Lighting Grade!
      if (biomeIdx === 2) {
        ctx.fillStyle = 'rgba(28, 12, 38, 0.36)';
        ctx.fillRect(0, 0, W, H);
      }
    } else {
      ctx.fillStyle = '#061224';
      ctx.fillRect(0, 0, W, H);
    }

    // 2. Surface Naval Battleships (with water wake foam!)
    if (HD.ready) {
      const nowWake = performance.now() * 0.005;
      for (let i = 0; i < state.enemies.length; i++) {
        const en = state.enemies[i];
        if (!en.ground) continue;
        const spr = HD.enemies.battleship;
        // White bow & stern water wake
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.32)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(en.x, en.y + spr.h * 0.42);
        ctx.lineTo(en.x - 16 - Math.sin(nowWake) * 2, en.y - spr.h * 0.48);
        ctx.moveTo(en.x, en.y + spr.h * 0.42);
        ctx.lineTo(en.x + 16 + Math.sin(nowWake) * 2, en.y - spr.h * 0.48);
        ctx.stroke();

        ctx.drawImage(spr.img, en.x - spr.w / 2, en.y - spr.h / 2, spr.w, spr.h);
      }
    }

    // 3. High-Altitude Translucent Clouds
    state.clouds.forEach((cl) => {
      const cw = 220 * cl.scale;
      const ch = 138 * cl.scale;
      ctx.drawImage(HD.ov.cloud, cl.x - cw / 2, cl.y - ch / 2, cw, ch);
    });

    // 4. Items & Spinning Gold Bullion Medals
    for (let i = 0; i < state.items.length; i++) {
      const it = state.items[i];
      if (it.kind === 'medal') {
        const sx = Math.max(0.28, Math.abs(Math.cos(it.spin)));
        ctx.save();
        ctx.translate(it.x, it.y);
        ctx.scale(sx, 1);
        ctx.drawImage(HD.ov.items.medal, -15, -15);
        ctx.restore();
      } else {
        ctx.drawImage(HD.ov.items[it.kind], it.x - 21, it.y - 21);
      }
    }

    // 5. Giant 3-Phase Stage Boss (True Silhouette Altitude Shadow + Reactor Glow + Turret Markers!)
    if (HD.ready && state.boss) {
      const bs = state.boss;
      const bAsset = HD.bosses[bs.bossIdx];
      const bShadow = HD.bossShadows[bs.bossIdx];

      // Realistic offset silhouette shadow on sea/fortress far below!
      ctx.drawImage(bShadow, bs.x - bs.w / 2 + 26, bs.y - bs.h / 2 + 38, bs.w * 0.92, bs.h * 0.92);

      ctx.save();
      if (bs.hitFlash > 0) ctx.filter = 'brightness(1.55)';
      ctx.drawImage(bAsset.img, bs.x - bs.w / 2, bs.y - bs.h / 2, bs.w, bs.h);
      ctx.restore();

      // Pulsing Reactor Core & Destructible Wing Turret Target Reticles
      const pulse = 0.55 + 0.45 * Math.sin(performance.now() * 0.012);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (bs.phase >= 2) {
        const rGrad = ctx.createRadialGradient(bs.x, bs.y + 4, 2, bs.x, bs.y + 4, bs.phase === 3 ? 44 : 28);
        rGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
        rGrad.addColorStop(0.45, bs.phase === 3 ? 'rgba(239, 68, 68, 0.65)' : 'rgba(251, 146, 60, 0.45)');
        rGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.arc(bs.x, bs.y + 4, bs.phase === 3 ? 44 : 28, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Draw crisp tactical lock-on brackets on live Left/Right Wing Turrets + scorched craters when destroyed!
      [
        [bs.leftTurretHp, bs.x - bs.txOff, bs.y + bs.tyOff],
        [bs.rightTurretHp, bs.x + bs.txOff, bs.y + bs.tyOff]
      ].forEach(([thp, tx, ty]) => {
        if (thp > 0) {
          ctx.strokeStyle = `rgba(56, 189, 248, ${0.45 + pulse * 0.45})`;
          ctx.lineWidth = 1.6;
          ctx.strokeRect(tx - 16, ty - 16, 32, 32);
          // Mini HP bar above each wing turret!
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(tx - 16, ty - 22, 32, 4);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(tx - 16, ty - 22, 32 * Math.max(0, thp / bs.maxTurretHp), 4);
        } else {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
          ctx.beginPath();
          ctx.arc(tx, ty, 13, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // 6. Airborne Enemy Planes (with Silhouette Altitude Shadows & Hit Flash!)
    if (HD.ready) {
      for (let i = 0; i < state.enemies.length; i++) {
        const en = state.enemies[i];
        if (en.ground) continue;
        const spr = HD.enemies[en.kind];
        const shd = HD.enemyShadows[en.kind];

        if (shd) {
          ctx.drawImage(shd, en.x - spr.w / 2 + 18, en.y - spr.h / 2 + 24, spr.w * 0.88, spr.h * 0.88);
        }

        ctx.save();
        if (en.hitFlash > 0) ctx.filter = 'brightness(1.7)';
        ctx.drawImage(spr.img, en.x - spr.w / 2, en.y - spr.h / 2, spr.w, spr.h);
        ctx.restore();
      }
    }

    // 7. Player Projectiles (Additive Glow Blend for Lasers & Vulcan!)
    for (let i = 0; i < state.bullets.length; i++) {
      const b = state.bullets[i];
      if (b.kind === 'vulcan') {
        ctx.drawImage(HD.ov.bullets.vulcan, b.x - 7, b.y - 15);
      } else if (b.kind === 'vulcanMax') {
        ctx.drawImage(HD.ov.bullets.vulcanMax, b.x - 8, b.y - 17);
      } else if (b.kind === 'laser') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(HD.ov.bullets.laser, b.x - 10, b.y - 28);
        ctx.restore();
      } else if (b.kind === 'missile') {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
        ctx.drawImage(HD.ov.bullets.missile, -9, -15);
        ctx.restore();
      } else {
        ctx.drawImage(HD.ov.bullets.rocket, b.x - 10, b.y - 17);
      }
    }

    // 8. HD 3D Pre-Rendered Player Fighter + Standby Live Formation Showcase!
    const p = state.player;
    const nowMs = performance.now();

    if (HD.ready && state.mode === 'title') {
      showcaseBank += (0 - showcaseBank) * 0.08;
      const sx = W * 0.5 + Math.sin(nowMs * 0.0014) * 20;
      const sy = H * 0.37 + Math.cos(nowMs * 0.0019) * 8;
      const bank = showcaseBank + Math.cos(nowMs * 0.0014) * 0.16;
      const fAsset = HD.fighters[state.fighterType][3];
      const fShadow = HD.fighterShadows[state.fighterType][3];
      const sc = 1.26;

      // Altitude ocean shadow
      ctx.drawImage(
        fShadow,
        sx - (fAsset.w * sc * 0.84) / 2 + 24,
        sy - (fAsset.h * sc * 0.84) / 2 + 32,
        fAsset.w * sc * 0.84,
        fAsset.h * sc * 0.84
      );

      // Escort wingmen cruising in V-formation
      const bob = Math.sin(nowMs * 0.004) * 4;
      [
        [sx - 66, sy + 20 + bob],
        [sx + 66, sy + 20 - bob]
      ].forEach(([dx, dy]) => {
        ctx.drawImage(HD.drone.img, dx - HD.drone.w / 2, dy - HD.drone.h / 2, HD.drone.w, HD.drone.h);
      });

      // Showcase jet/prop afterburners
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const flameLen = 22 + (Math.floor(nowMs / 38) % 8);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.88)';
      if (state.fighterType === 'lightning') {
        ctx.fillRect(sx - 18, sy + fAsset.h * sc * 0.28, 6, flameLen);
        ctx.fillRect(sx + 12, sy + fAsset.h * sc * 0.28, 6, flameLen);
      } else {
        ctx.fillRect(sx - 7, sy + fAsset.h * sc * 0.34, 14, flameLen);
      }
      ctx.restore();

      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale((1 - Math.abs(bank) * 0.14) * sc, sc);
      ctx.rotate(bank * 0.12);
      ctx.drawImage(fAsset.img, -fAsset.w / 2, -fAsset.h / 2, fAsset.w, fAsset.h);
      if (state.fighterType === 'lightning') {
        ctx.drawImage(HD.ov.propBlur, -26, -fAsset.h * 0.36);
        ctx.drawImage(HD.ov.propBlur, -2, -fAsset.h * 0.36);
      }
      ctx.restore();
    }

    if (HD.ready && p && state.mode !== 'gameover' && state.mode !== 'title') {
      const blinkHide = p.invuln > 0 && Math.floor(nowMs / 70) % 2 === 0;
      if (!blinkHide) {
        const tier = p.power >= 4 ? 3 : p.power >= 2 ? 2 : 1;
        const fAsset = HD.fighters[state.fighterType][tier];
        const fShadow = HD.fighterShadows[state.fighterType][tier];

        // True aircraft silhouette shadow on ocean/fortress below!
        ctx.drawImage(
          fShadow,
          p.x - (fAsset.w * 0.85) / 2 + 18,
          p.y - (fAsset.h * 0.85) / 2 + 24,
          fAsset.w * 0.85,
          fAsset.h * 0.85
        );

        // Additive Mach Shock-Diamond Afterburners & Muzzle Flash!
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const flameLen = (p.thrust > 0 ? 24 : p.thrust < 0 ? 10 : 16) + (Math.floor(nowMs / 35) % 7);
        const flameColor = p.power >= 4 ? 'rgba(56, 189, 248, 0.88)' : 'rgba(251, 191, 36, 0.88)';
        ctx.fillStyle = flameColor;
        if (state.fighterType === 'lightning') {
          ctx.fillRect(p.x - 14, p.y + fAsset.h * 0.28, 5, flameLen);
          ctx.fillRect(p.x + 9, p.y + fAsset.h * 0.28, 5, flameLen);
        } else {
          ctx.fillRect(p.x - 6, p.y + fAsset.h * 0.34, 12, flameLen);
        }
        if (p.muzzleFlash > 0) {
          ctx.fillStyle = 'rgba(254, 240, 138, 0.75)';
          ctx.beginPath();
          ctx.arc(p.x - 9, p.y - fAsset.h * 0.42, 6, 0, Math.PI * 2);
          ctx.arc(p.x + 9, p.y - fAsset.h * 0.42, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // 3D Banking Tilt + Crisp HD PBR Fighter Sprite
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(1 - Math.abs(p.bank) * 0.15, 1);
        ctx.rotate(p.bank * 0.11);
        ctx.drawImage(fAsset.img, -fAsset.w / 2, -fAsset.h / 2, fAsset.w, fAsset.h);

        // Spinning propeller blur on P-38 twin booms!
        if (state.fighterType === 'lightning') {
          ctx.drawImage(HD.ov.propBlur, -26, -fAsset.h * 0.36);
          ctx.drawImage(HD.ov.propBlur, -2, -fAsset.h * 0.36);
        }
        ctx.restore();

        // Subtle glowing cockpit hitbox indicator when boss bullets are dense so dodging feels razor-precise!
        if (state.enemyBullets.length >= 10) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }

        // Autonomous & Formation Sortie HD Wingman Drones
        const drones = getDronePositions(p);
        drones.forEach((d) => {
          if (d.escort) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(d.x, d.y, 17, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
          ctx.drawImage(HD.drone.img, d.x - HD.drone.w / 2, d.y - HD.drone.h / 2, HD.drone.w, HD.drone.h);
        });

        // Energy Shield Barrier
        if (p.shield) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.85)';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 38, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // In 2P Co-op, show subtle callsign tag above our fighter so 1P & 2P are distinct!
        if (coopState.active) {
          ctx.font = '700 10px Chakra Petch, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
          ctx.fillRect(p.x - 28, p.y + 34, 56, 14);
          ctx.fillStyle = '#fde047';
          ctx.fillText(`${coopState.mySlot}P ${pilotCallsign}`, p.x, p.y + 44);
        }
      }

      // 8b. Render 2-Player Co-op Partner Fighter + Callsign Tag!
      if (coopState.active && coopState.partner.present && coopState.partner.lives > 0) {
        const pt = coopState.partner;
        const pTier = pt.power >= 4 ? 3 : pt.power >= 2 ? 2 : 1;
        const pType = HD.fighters[pt.fighter] ? pt.fighter : 'skyray';
        const pfAsset = HD.fighters[pType][pTier];
        const pfShadow = HD.fighterShadows[pType][pTier];

        ctx.drawImage(
          pfShadow,
          pt.x - (pfAsset.w * 0.85) / 2 + 18,
          pt.y - (pfAsset.h * 0.85) / 2 + 24,
          pfAsset.w * 0.85,
          pfAsset.h * 0.85
        );

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const pFlame = 16 + (Math.floor(nowMs / 35) % 7);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
        if (pType === 'lightning') {
          ctx.fillRect(pt.x - 14, pt.y + pfAsset.h * 0.28, 5, pFlame);
          ctx.fillRect(pt.x + 9, pt.y + pfAsset.h * 0.28, 5, pFlame);
        } else {
          ctx.fillRect(pt.x - 6, pt.y + pfAsset.h * 0.34, 12, pFlame);
        }
        ctx.restore();

        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.scale(1 - Math.abs(pt.bank) * 0.15, 1);
        ctx.rotate(pt.bank * 0.11);
        ctx.drawImage(pfAsset.img, -pfAsset.w / 2, -pfAsset.h / 2, pfAsset.w, pfAsset.h);
        if (pType === 'lightning') {
          ctx.drawImage(HD.ov.propBlur, -26, -pfAsset.h * 0.36);
          ctx.drawImage(HD.ov.propBlur, -2, -pfAsset.h * 0.36);
        }
        ctx.restore();

        // Render Partner's LV.3+ Wingman Drones on our screen too!
        const pBob = Math.sin(nowMs * 0.0045) * 4;
        if (pt.power === 3) {
          ctx.drawImage(HD.drone.img, pt.x - 42 - HD.drone.w / 2, pt.y + 10 + pBob - HD.drone.h / 2, HD.drone.w, HD.drone.h);
        } else if (pt.power >= 4) {
          ctx.drawImage(HD.drone.img, pt.x - 44 - HD.drone.w / 2, pt.y + 10 + pBob - HD.drone.h / 2, HD.drone.w, HD.drone.h);
          ctx.drawImage(HD.drone.img, pt.x + 44 - HD.drone.w / 2, pt.y + 10 - pBob - HD.drone.h / 2, HD.drone.w, HD.drone.h);
        }

        if (pt.shield) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 36, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        const otherSlot = coopState.mySlot === 1 ? 2 : 1;
        const pwTag = (pt.power || 1) >= 5 ? 'MAX' : `LV.${pt.power || 1}`;
        const tagText = pt.aiMode ? `🤖 ${pt.callsign} [AI·${pwTag}]` : `${otherSlot}P ${pt.callsign} · ${pwTag}`;
        const tagW = Math.max(72, tagText.length * 6.8);
        ctx.font = '700 10px Chakra Petch, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
        ctx.fillRect(pt.x - tagW / 2, pt.y + 34, tagW, 14);
        ctx.fillStyle = pt.aiMode ? '#34d399' : '#38bdf8';
        ctx.fillText(tagText, pt.x, pt.y + 44);
      }
    }

    // 9. Allied B-29 Superfortress Squadron
    if (HD.ready) {
      state.airStrikeBombers.forEach((bm) => {
        ctx.drawImage(HD.bomberShadow, bm.x - HD.bomber.w / 2 + 28, bm.y - HD.bomber.h / 2 + 38);
        ctx.drawImage(HD.bomber.img, bm.x - HD.bomber.w / 2, bm.y - HD.bomber.h / 2, HD.bomber.w, HD.bomber.h);
      });
    }

    // 10. 12-Frame HD Volumetric Pyrotechnic Explosions + Shockwaves + Sparks
    if (HD.ready) {
      for (let i = 0; i < state.explosions.length; i++) {
        const ex = state.explosions[i];
        const idx = Math.min(11, Math.floor(ex.frame));
        const sz = 112 * ex.scale;
        ctx.drawImage(HD.explosionFrames[idx], ex.x - sz / 2, ex.y - sz / 2, sz, sz);
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < state.shockwaves.length; i++) {
      const sw = state.shockwaves[i];
      ctx.strokeStyle = `rgba(253, 224, 71, ${Math.max(0, sw.alpha)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    for (let i = 0; i < state.sparks.length; i++) {
      const sp = state.sparks[i];
      ctx.fillStyle = sp.color;
      ctx.fillRect(sp.x - sp.size / 2, sp.y - sp.size / 2, sp.size, sp.size);
    }

    // 11. High-Contrast Enemy Bullets (Always rendered cleanly on top of explosions & terrain!)
    for (let i = 0; i < state.enemyBullets.length; i++) {
      const eb = state.enemyBullets[i];
      if (eb.kind === 'purple') {
        ctx.drawImage(HD.ov.bullets.enemyPurple, eb.x - 13, eb.y - 13);
      } else if (eb.kind === 'amber') {
        ctx.drawImage(HD.ov.bullets.enemyAmber, eb.x - 11, eb.y - 11);
      } else {
        ctx.drawImage(HD.ov.bullets.enemyRed, eb.x - 11, eb.y - 11);
      }
    }

    // 12. Tactical Score & Upgrade Popups
    ctx.font = 'italic 700 13px Chakra Petch, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < state.popups.length; i++) {
      const pp = state.popups[i];
      ctx.globalAlpha = Math.max(0, pp.life / pp.maxLife);
      ctx.fillStyle = '#020617';
      ctx.fillText(pp.text, pp.x + 1.2, pp.y + 1.2);
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
  loadAllHdAssets().catch((err) => {
    console.error('HD asset load error:', err);
    btnStartGame.textContent = '출격 개시';
  });
  requestAnimationFrame(loop);
})();
