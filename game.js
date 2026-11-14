(() => {
  'use strict';

  /* =========================================================================
   * 1. RETRO WEB AUDIO SYNTHESIZER (100% Offline, Zero External Audio Files)
   * ========================================================================= */
  class ArcadeAudio {
    constructor() {
      this.ctx = null;
      this.enabled = true;
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

    tone(freqStart, freqEnd, duration, type = 'square', gainVal = 0.08, delay = 0) {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now);
      if (freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
      }
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.01);
    }

    noise(duration = 0.22, gainVal = 0.12) {
      if (!this.enabled || !this.ctx) return;
      const sampleRate = this.ctx.sampleRate;
      const length = Math.floor(sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 950;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start();
    }

    laser(isDual = false) {
      this.tone(isDual ? 1080 : 920, 240, 0.09, 'square', 0.055);
    }

    enemyArmor() {
      this.tone(520, 310, 0.08, 'triangle', 0.09);
    }

    enemyBoom(isBoss = false) {
      this.noise(isBoss ? 0.34 : 0.16, isBoss ? 0.16 : 0.09);
      this.tone(isBoss ? 260 : 380, 65, isBoss ? 0.28 : 0.14, 'sawtooth', 0.07);
    }

    diveWhistle() {
      this.tone(740, 290, 0.32, 'sine', 0.04);
    }

    powerUp() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((n, i) => this.tone(n, n, 0.08, 'square', 0.065, i * 0.065));
    }

    stageStart() {
      const melody = [392, 523.25, 659.25, 783.99, 659.25, 1046.5];
      melody.forEach((n, i) => this.tone(n, n, 0.1, 'square', 0.06, i * 0.085));
    }

    hyperBomb() {
      this.noise(0.55, 0.22);
      this.tone(180, 38, 0.5, 'sawtooth', 0.12);
    }

    playerHit() {
      this.noise(0.45, 0.2);
      this.tone(300, 55, 0.42, 'sawtooth', 0.1);
    }
  }

  /* =========================================================================
   * 2. PIXEL-ART SPRITE GENERATOR (Cached Offscreen Canvases for 60FPS Speed)
   * ========================================================================= */
  const PALETTE = {
    '.': null,
    W: '#f4f7fb', // Crisp white hull
    R: '#ef3349', // Arcade crimson wing
    A: '#fbbd23', // Warm amber gold
    C: '#24d2ee', // Thruster / visor cyan
    E: '#22d38a', // Boss emerald
    B: '#388bfd', // Damaged boss cobalt
    D: '#64748b', // Steel shadow
    O: '#fb7185'  // Coral highlight
  };

  const SPRITE_MAPS = {
    player: [
      '.......WW.......',
      '.......WW.......',
      '......WWWW......',
      '......WCCW......',
      '.....WWWWWW.....',
      '...RR.WWWW.RR...',
      '...RRWWWWWWWR...',
      '..RRRWWAAWWWRR..',
      '.WRRRWWWWWWWRRW.',
      'WWRRRWWWWWWWRRWW',
      'WW.RRWW..WWWR.WW',
      'WW..RWW..WWR..WW',
      '....AA....AA....',
      '....CC....CC....'
    ],
    bossA1: [
      '....AA....AA....',
      '...AAAA..AAAA...',
      '..AAEEEEEEEEAA..',
      '.AAEEWWWWWWEEAA.',
      '.AEEWWRRRRWWEEA.',
      'AAEECCCCCCCCEEAA',
      'AAEEEEEEEEEEEEAA',
      '.AAEEAAEEAAEEAA.',
      '..EEEE.EE.EEEE..',
      '.EE..E.EE.E..EE.',
      'EE.....AA.....EE',
      'AA............AA'
    ],
    bossA2: [
      '.....AA..AA.....',
      '....AAAAAAAA....',
      '...AAEEEEEEAA...',
      '..AAEEWWWWEEAA..',
      '.AAEEWRRRRWWEEA.',
      '.AEECCCCCCCCEEA.',
      '.AAEEEEEEEEEEAA.',
      '..AAEEAAEEAAEE..',
      '...EEE.EE.EEE...',
      '..EE..AAAA..EE..',
      '....AA....AA....',
      '................'
    ],
    bossHurt1: [
      '....AA....AA....',
      '...AAAA..AAAA...',
      '..AABBBBBBBBAA..',
      '.AABBWWWWWWBBAA.',
      '.ABBWWRRRRWBBBA.',
      'AABBRRRRRRRRBBA.',
      'AABBBBBBBBBBBBAA',
      '.AABBAA..AABBAA.',
      '..BBBB.BB.BBBB..',
      '.BB..B.BB.B..BB.',
      'BB.....AA.....BB',
      'AA............AA'
    ],
    butterfly1: [
      '..RR........RR..',
      '.RRRR..WW..RRRR.',
      'RRRRR.WWWW.RRRRR',
      'RRRRWWWRRWWWRRRR',
      'RRRRWCCCCCCWRRRR',
      '.RRRWWWWWWWWRRR.',
      '..RRRRRRRRRRRR..',
      '...RRR.AA.RRR...',
      '..RR...AA...RR..',
      '.R............R.'
    ],
    butterfly2: [
      '................',
      '...RR..WW..RR...',
      '..RRRRWWWWWRRR..',
      '.RRRRWWRRWWRRRR.',
      '.RRRWCCCCCCWRRR.',
      '..RRWWWWWWWWRR..',
      '...RRRRRRRRRR...',
      '....RR.AA.RR....',
      '...R...AA...R...',
      '................'
    ],
    wasp1: [
      '....CC....CC....',
      '...C..AAAA..C...',
      '..AA.AAAAAA.AA..',
      '.AAAAWWAAWWAAAA.',
      '.AAACCCCCCCAAAA.',
      '..AAAAAAAAAAAA..',
      '...AA.RRRR.AA...',
      '..AA.RRRRRR.AA..',
      '.AA...RRRR...AA.',
      '.......AA.......'
    ],
    wasp2: [
      '.....CC..CC.....',
      '....C.AAAA.C....',
      '...AAAAAAAAAA...',
      '..AAAWWAAWWAAA..',
      '..AAACCCCCCAAA..',
      '...AAAAAAAAAA...',
      '....AARRRRAA....',
      '...AA.RRRR.AA...',
      '.......AA.......',
      '................'
    ]
  };

  function bakeSprite(rows, pixelSize = 2) {
    const h = rows.length;
    const w = rows[0].length;
    const off = document.createElement('canvas');
    off.width = w * pixelSize;
    off.height = h * pixelSize;
    const octx = off.getContext('2d');
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < w; x++) {
        const color = PALETTE[row[x]];
        if (color) {
          octx.fillStyle = color;
          octx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
    }
    return off;
  }

  const SPRITES = {
    player: bakeSprite(SPRITE_MAPS.player, 2),
    boss1: bakeSprite(SPRITE_MAPS.bossA1, 2),
    boss2: bakeSprite(SPRITE_MAPS.bossA2, 2),
    bossHurt: bakeSprite(SPRITE_MAPS.bossHurt1, 2),
    butterfly1: bakeSprite(SPRITE_MAPS.butterfly1, 2),
    butterfly2: bakeSprite(SPRITE_MAPS.butterfly2, 2),
    wasp1: bakeSprite(SPRITE_MAPS.wasp1, 2),
    wasp2: bakeSprite(SPRITE_MAPS.wasp2, 2)
  };

  /* =========================================================================
   * 3. DOM REFERENCES & PWA INSTALLATION CONTROLLER
   * ========================================================================= */
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const viewportEl = document.getElementById('stage-viewport');

  const scoreEl = document.getElementById('score-display');
  const highScoreEl = document.getElementById('high-score-display');
  const livesRackEl = document.getElementById('lives-rack');
  const powerBadgesEl = document.getElementById('powerup-badges');
  const bombCountEl = document.getElementById('bomb-count');
  const btnHyperBomb = document.getElementById('btn-hyper-bomb');
  const btnAutoFire = document.getElementById('btn-autofire');
  const btnSound = document.getElementById('btn-sound');
  const btnPause = document.getElementById('btn-pause');

  const waveBannerEl = document.getElementById('wave-banner');
  const waveTitleEl = document.getElementById('wave-banner-title');
  const waveSubEl = document.getElementById('wave-banner-sub');

  const startScreenEl = document.getElementById('start-screen');
  const pauseScreenEl = document.getElementById('pause-screen');
  const gameoverScreenEl = document.getElementById('gameover-screen');
  const finalScoreEl = document.getElementById('final-score');
  const finalStageEl = document.getElementById('final-stage');
  const finalAccEl = document.getElementById('final-accuracy');
  const gameoverMsgEl = document.getElementById('gameover-record-msg');

  const btnStartGame = document.getElementById('btn-start-game');
  const btnResumeGame = document.getElementById('btn-resume-game');
  const btnRestartPause = document.getElementById('btn-restart-from-pause');
  const btnRetryGame = document.getElementById('btn-retry-game');
  const btnInstallPwa = document.getElementById('btn-install-pwa');
  const iosGuideEl = document.getElementById('ios-install-guide');

  // Register Service Worker for offline PWA support & immediate auto-update
  if ('serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing && state.mode === 'title') {
        refreshing = true;
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

  let deferredInstallPrompt = null;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (isStandalone) {
    btnInstallPwa.hidden = true;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    btnInstallPwa.hidden = false;
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    btnInstallPwa.hidden = true;
  });

  btnInstallPwa.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice.catch(() => {});
      deferredInstallPrompt = null;
    } else {
      iosGuideEl.hidden = !iosGuideEl.hidden;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (!isIOS) {
        iosGuideEl.innerHTML =
          '💡 <strong>앱 설치 안내:</strong> 크롬/삼성 인터넷 우측 상단 <strong>[⋮ 메뉴] → [홈 화면에 추가 / 앱 설치]</strong>를 누르면 스마트폰 바탕화면에 설치됩니다!';
      }
    }
  });

  /* =========================================================================
   * 4. CORE GAME STATE & CONSTANTS
   * ========================================================================= */
  const audio = new ArcadeAudio();
  const STORAGE_KEY = 'star_galaga_high_score_v1';

  let W = 390;
  let H = 640;
  let dpr = 1;

  function resizeCanvas() {
    const rect = viewportEl.getBoundingClientRect();
    W = Math.max(300, rect.width);
    H = Math.max(400, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (state.player) {
      state.player.x = Math.max(26, Math.min(W - 26, state.player.x));
      state.player.y = Math.max(58, Math.min(H - 34, state.player.y));
    }
  }
  window.addEventListener('resize', resizeCanvas);

  const state = {
    mode: 'title', // 'title' | 'playing' | 'paused' | 'gameover'
    score: 0,
    highScore: Number(localStorage.getItem(STORAGE_KEY) || 0),
    stage: 1,
    isBonusStage: false,
    bonusSpawnedCount: 0,
    bonusKilledCount: 0,
    lives: 3,
    bombs: 2,
    autoFire: true,
    shotsFired: 0,
    shotsHit: 0,
    nextExtraLifeScore: 20000,
    screenShake: 0,
    shockwave: null,
    swayTime: 0,
    diveCooldown: 2.0,
    stageClearPending: false,
    stageClearTimer: 0,
    player: null,
    bullets: [],
    enemyBullets: [],
    enemies: [],
    capsules: [],
    particles: [],
    popups: [],
    stars: []
  };

  highScoreEl.textContent = state.highScore.toLocaleString();

  function initStars() {
    state.stars = [];
    const palette = ['#ffffff', '#38bdf8', '#fbbf24', '#f43f5e', '#94a3b8'];
    for (let i = 0; i < 85; i++) {
      state.stars.push({
        x: Math.random() * 540,
        y: Math.random() * 900,
        speed: 22 + Math.random() * 95,
        size: Math.random() < 0.25 ? 2 : 1.3,
        color: palette[i % palette.length],
        blinkOffset: Math.random() * Math.PI * 2
      });
    }
  }

  function createPlayer() {
    return {
      x: W / 2,
      y: H - 56,
      vx: 0,
      dual: false,
      rapidTimer: 0,
      shield: false,
      invulnTimer: 2.0,
      fireCooldown: 0
    };
  }

  /* =========================================================================
   * 5. WAVE & FORMATION GENERATOR (Classic Galaga + Challenging Stages)
   * ========================================================================= */
  function cubicBezier(p0, p1, p2, p3, t) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    return {
      x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
      y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
    };
  }

  function showWaveBanner(title, sub, durationMs = 2100) {
    waveTitleEl.textContent = title;
    waveSubEl.textContent = sub;
    waveBannerEl.classList.add('is-visible');
    clearTimeout(showWaveBanner._timer);
    showWaveBanner._timer = setTimeout(() => {
      waveBannerEl.classList.remove('is-visible');
    }, durationMs);
  }

  function spawnStage(stageNum) {
    state.enemies = [];
    state.enemyBullets = [];
    state.isBonusStage = stageNum % 3 === 0;
    state.stageClearPending = false;
    audio.stageStart();

    if (state.isBonusStage) {
      showWaveBanner(`CHALLENGING STAGE ${stageNum}`, '보너스 편대! 적의 공격 없이 모두 격추하면 +10,000점!');
      const totalRaiders = 24;
      state.bonusSpawnedCount = totalRaiders;
      state.bonusKilledCount = 0;

      for (let i = 0; i < totalRaiders; i++) {
        const cohort = Math.floor(i / 8);
        const idxInCohort = i % 8;
        const fromLeft = cohort % 2 === 0;
        const type = i % 6 === 0 ? 'boss' : i % 2 === 0 ? 'butterfly' : 'wasp';

        const p0 = { x: fromLeft ? -30 : W + 30, y: 80 + cohort * 35 };
        const p1 = { x: fromLeft ? W * 0.92 : W * 0.08, y: H * 0.25 };
        const p2 = { x: fromLeft ? W * 0.12 : W * 0.88, y: H * 0.68 };
        const p3 = { x: fromLeft ? W + 50 : -50, y: -40 };

        state.enemies.push({
          type,
          hp: type === 'boss' ? 2 : 1,
          maxHp: type === 'boss' ? 2 : 1,
          state: 'bonus_path',
          delay: cohort * 2.3 + idxInCohort * 0.18,
          pathT: 0,
          pathSpeed: 0.26 + Math.min(0.12, stageNum * 0.008),
          p0,
          p1,
          p2,
          p3,
          x: p0.x,
          y: p0.y,
          angle: 0,
          tractorTimer: 0
        });
      }
      updateHud();
      return;
    }

    const titles = [
      '선봉 정찰 편대 진입!',
      '강습 폭격 편대 주의!',
      '정예 호위 함대 출현!',
      '초고속 기동 편대 돌입!'
    ];
    showWaveBanner(`STAGE ${stageNum}`, titles[(stageNum - 1) % titles.length]);

    // Classic 5-row Galaga Formation:
    // Row 0: 4 Boss Galagas
    // Row 1-2: 8 Crimson Butterflies each
    // Row 3-4: 8-10 Amber Wasps each
    const cols = W < 360 ? 7 : 8;
    const spacingX = Math.min(40, (W - 56) / cols);
    const startX = (W - (cols - 1) * spacingX) / 2;
    const topY = 74;
    const spacingY = 34;

    const layout = [
      { row: 0, type: 'boss', count: 4 },
      { row: 1, type: 'butterfly', count: cols - 2 },
      { row: 2, type: 'butterfly', count: cols },
      { row: 3, type: 'wasp', count: cols },
      { row: 4, type: 'wasp', count: cols }
    ];

    let spawnOrder = 0;
    layout.forEach(({ row, type, count }) => {
      const rowOffset = ((cols - count) * spacingX) / 2;
      for (let c = 0; c < count; c++) {
        const slotX = startX + rowOffset + c * spacingX;
        const slotY = topY + row * spacingY;
        const fromLeft = (row + c) % 2 === 0;

        const p0 = { x: fromLeft ? -32 : W + 32, y: -20 - (c % 3) * 24 };
        const p1 = { x: fromLeft ? W * 0.85 : W * 0.15, y: H * 0.34 };
        const p2 = { x: fromLeft ? W * 0.18 : W * 0.82, y: H * 0.48 };
        const p3 = { x: slotX, y: slotY };

        state.enemies.push({
          type,
          hp: type === 'boss' ? 2 : 1,
          maxHp: type === 'boss' ? 2 : 1,
          state: 'entering', // 'entering' | 'formation' | 'diving' | 'tractor'
          delay: spawnOrder * 0.065,
          pathT: 0,
          pathSpeed: 0.72 + Math.min(0.35, stageNum * 0.025),
          p0,
          p1,
          p2,
          p3,
          baseX: slotX,
          baseY: slotY,
          x: p0.x,
          y: p0.y,
          angle: 0,
          diveTime: 0,
          diveDir: fromLeft ? 1 : -1,
          diveStartX: slotX,
          shotCount: 0,
          tractorTimer: 0
        });
        spawnOrder++;
      }
    });

    state.diveCooldown = Math.max(0.9, 2.3 - stageNum * 0.12);
    updateHud();
  }

  /* =========================================================================
   * 6. HUD & SCORE HELPERS
   * ========================================================================= */
  function addScore(pts, x, y, customLabel = null, color = '#fbbd23') {
    state.score += pts;
    if (state.score >= state.nextExtraLifeScore) {
      state.lives = Math.min(5, state.lives + 1);
      state.nextExtraLifeScore += 35000;
      addPopup(state.player.x, state.player.y - 26, '1UP BONUS!', '#22d38a');
      audio.powerUp();
      updateHud();
    }
    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem(STORAGE_KEY, String(state.highScore));
      highScoreEl.textContent = state.highScore.toLocaleString();
    }
    scoreEl.textContent = state.score.toLocaleString();
    if (x != null && y != null) {
      addPopup(x, y, customLabel || `+${pts}`, color);
    }
  }

  function addPopup(x, y, text, color = '#fbbd23') {
    state.popups.push({ x, y, text, color, life: 0.85, maxLife: 0.85 });
  }

  function spawnExplosion(x, y, colorA = '#ef3349', colorB = '#fbbd23', count = 16) {
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.35;
      const spd = 45 + Math.random() * 155;
      state.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: Math.random() < 0.4 ? 3.5 : 2.2,
        color: i % 2 === 0 ? colorA : colorB,
        life: 0.35 + Math.random() * 0.28,
        maxLife: 0.63
      });
    }
  }

  function updateHud() {
    scoreEl.textContent = state.score.toLocaleString();
    highScoreEl.textContent = state.highScore.toLocaleString();

    // Lives pips
    livesRackEl.innerHTML = '';
    const displayLives = Math.max(0, state.lives - 1);
    for (let i = 0; i < displayLives; i++) {
      const pip = document.createElement('span');
      pip.className = 'life-pip';
      livesRackEl.appendChild(pip);
    }

    // Stage & active power-up tags
    const tags = [`<span class="power-tag">STG ${state.stage}</span>`];
    if (state.player) {
      if (state.player.dual) {
        tags.push('<span class="power-tag power-tag--amber">DUAL</span>');
      }
      if (state.player.shield) {
        tags.push('<span class="power-tag">SHIELD</span>');
      }
      if (state.player.rapidTimer > 0) {
        tags.push('<span class="power-tag power-tag--amber">RAPID</span>');
      }
    }
    powerBadgesEl.innerHTML = tags.join('');

    bombCountEl.textContent = `x${state.bombs}`;
    btnHyperBomb.disabled = state.bombs <= 0 || state.mode !== 'playing';
  }

  /* =========================================================================
   * 7. INPUT HANDLING (Full 2D Relative Touch Slide + 8-Way Keyboard + Buttons)
   * ========================================================================= */
  const keys = { left: false, right: false, up: false, down: false, shoot: false };
  const touchState = { active: false, pointerId: null, lastX: 0, lastY: 0 };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      keys.left = true;
      if (state.mode === 'playing') e.preventDefault();
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      keys.right = true;
      if (state.mode === 'playing') e.preventDefault();
    }
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      keys.up = true;
      if (state.mode === 'playing') e.preventDefault();
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      keys.down = true;
      if (state.mode === 'playing') e.preventDefault();
    }
    if (e.code === 'Space') {
      keys.shoot = true;
      if (state.mode === 'playing') e.preventDefault();
    }
    if ((e.code === 'KeyB' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') && state.mode === 'playing') {
      triggerHyperBomb();
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
    audio.unlock();
    if (state.mode !== 'playing') return;
    canvas.setPointerCapture(e.pointerId);
    touchState.active = true;
    touchState.pointerId = e.pointerId;
    touchState.lastX = e.clientX;
    touchState.lastY = e.clientY;

    // Manual fire tap when autoFire is turned off
    if (!state.autoFire) {
      firePlayerLaser();
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!touchState.active || e.pointerId !== touchState.pointerId || state.mode !== 'playing') return;
    const dx = (e.clientX - touchState.lastX) * 1.25;
    const dy = (e.clientY - touchState.lastY) * 1.25;
    touchState.lastX = e.clientX;
    touchState.lastY = e.clientY;
    if (state.player) {
      const marginX = state.player.dual ? 34 : 20;
      state.player.x = Math.max(marginX, Math.min(W - marginX, state.player.x + dx));
      state.player.y = Math.max(58, Math.min(H - 34, state.player.y + dy));
      state.player.thrust = dy < -0.6 ? 1 : dy > 0.6 ? -1 : 0;
    }
  });

  function endPointer(e) {
    if (e.pointerId === touchState.pointerId) {
      touchState.active = false;
      touchState.pointerId = null;
      if (state.player) state.player.thrust = 0;
    }
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  btnAutoFire.addEventListener('click', () => {
    audio.unlock();
    state.autoFire = !state.autoFire;
    btnAutoFire.setAttribute('aria-pressed', String(state.autoFire));
  });

  btnSound.addEventListener('click', () => {
    state.soundToggle = !audio.enabled;
    audio.enabled = !audio.enabled;
    if (audio.enabled) audio.unlock();
    btnSound.setAttribute('aria-pressed', String(audio.enabled));
    btnSound.textContent = audio.enabled ? '🔊' : '🔇';
  });

  btnPause.addEventListener('click', () => {
    if (state.mode === 'playing') pauseGame();
    else if (state.mode === 'paused') resumeGame();
  });

  btnHyperBomb.addEventListener('click', () => {
    audio.unlock();
    triggerHyperBomb();
  });

  btnStartGame.addEventListener('click', () => {
    audio.unlock();
    startNewGame();
  });

  btnResumeGame.addEventListener('click', () => resumeGame());
  btnRestartPause.addEventListener('click', () => startNewGame());
  btnRetryGame.addEventListener('click', () => startNewGame());

  /* =========================================================================
   * 8. COMBAT ACTIONS (Lasers, Hyper-Nova Bomb, Power-Ups, Collisions)
   * ========================================================================= */
  function firePlayerLaser() {
    const p = state.player;
    if (!p || p.fireCooldown > 0) return;

    const maxActiveShots = p.dual ? 8 : 4;
    if (state.bullets.length >= maxActiveShots) return;

    const cooldown = p.rapidTimer > 0 ? 0.13 : 0.22;
    p.fireCooldown = cooldown;

    if (p.dual) {
      state.bullets.push(
        { x: p.x - 14, y: p.y - 16, vy: -640 },
        { x: p.x + 14, y: p.y - 16, vy: -640 }
      );
      state.shotsFired += 2;
    } else {
      state.bullets.push({ x: p.x, y: p.y - 18, vy: -640 });
      state.shotsFired += 1;
    }
    audio.laser(p.dual);
  }

  function triggerHyperBomb() {
    if (state.mode !== 'playing' || state.bombs <= 0 || !state.player) return;
    state.bombs--;
    state.enemyBullets = [];
    state.screenShake = 0.45;
    state.shockwave = { x: state.player.x, y: state.player.y, r: 10, maxR: Math.hypot(W, H) };
    audio.hyperBomb();

    // Damage all active enemies on screen
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const en = state.enemies[i];
      if (en.delay > 0) continue;
      en.hp -= 2;
      if (en.hp <= 0) {
        destroyEnemy(i, true);
      } else {
        spawnExplosion(en.x, en.y, '#38bdf8', '#ffffff', 6);
      }
    }
    updateHud();
  }

  function maybeDropCapsule(x, y) {
    if (state.capsules.length >= 2) return;
    if (Math.random() > 0.16) return;
    const roll = Math.random();
    let kind = 'rapid';
    let label = 'R';
    let color = '#fbbd23';
    if (roll < 0.34 && !state.player.dual) {
      kind = 'dual';
      label = 'D';
      color = '#ef3349';
    } else if (roll < 0.65 && !state.player.shield) {
      kind = 'shield';
      label = 'S';
      color = '#24d2ee';
    } else if (roll < 0.82 && state.bombs < 4) {
      kind = 'bomb';
      label = 'B';
      color = '#22d38a';
    }
    state.capsules.push({ x, y, vy: 118, kind, label, color, pulse: 0 });
  }

  function applyCapsule(cap) {
    const p = state.player;
    audio.powerUp();
    if (cap.kind === 'dual') {
      p.dual = true;
      addScore(500, p.x, p.y - 24, 'DUAL FIGHTER!', '#ef3349');
    } else if (cap.kind === 'shield') {
      p.shield = true;
      addScore(300, p.x, p.y - 24, 'SHIELD ON!', '#24d2ee');
    } else if (cap.kind === 'bomb') {
      state.bombs = Math.min(5, state.bombs + 1);
      addScore(300, p.x, p.y - 24, 'BOMB +1!', '#22d38a');
    } else {
      p.rapidTimer = 11.0;
      addScore(300, p.x, p.y - 24, 'RAPID LASER!', '#fbbd23');
    }
    updateHud();
  }

  function destroyEnemy(index, byBomb = false) {
    const en = state.enemies[index];
    const isDiving = en.state === 'diving' || en.state === 'tractor' || en.state === 'bonus_path';
    let pts = 80;
    if (en.type === 'boss') pts = isDiving ? 400 : 150;
    else if (en.type === 'butterfly') pts = isDiving ? 160 : 80;
    else pts = isDiving ? 100 : 50;

    addScore(pts, en.x, en.y);
    if (state.isBonusStage) state.bonusKilledCount++;

    const colA = en.type === 'boss' ? '#22d38a' : en.type === 'butterfly' ? '#ef3349' : '#fbbd23';
    spawnExplosion(en.x, en.y, colA, '#ffffff', en.type === 'boss' ? 22 : 13);
    if (!byBomb) {
      audio.enemyBoom(en.type === 'boss');
      if (isDiving && !state.isBonusStage) maybeDropCapsule(en.x, en.y);
    }
    if (en.type === 'boss') state.screenShake = Math.max(state.screenShake, 0.16);
    state.enemies.splice(index, 1);
  }

  function damagePlayer() {
    const p = state.player;
    if (!p || p.invulnTimer > 0) return;

    if (p.shield) {
      p.shield = false;
      p.invulnTimer = 1.6;
      spawnExplosion(p.x, p.y, '#24d2ee', '#ffffff', 18);
      addPopup(p.x, p.y - 20, 'SHIELD GUARD!', '#24d2ee');
      audio.enemyArmor();
      updateHud();
      return;
    }

    // If Dual Fighter is hit, lose one wing first just like classic Galaga!
    if (p.dual) {
      p.dual = false;
      p.invulnTimer = 2.0;
      state.screenShake = 0.28;
      spawnExplosion(p.x + 14, p.y, '#ef3349', '#fbbd23', 20);
      addPopup(p.x, p.y - 20, 'WINGMAN LOST!', '#ef3349');
      audio.playerHit();
      updateHud();
      return;
    }

    // Lose 1 life
    state.lives--;
    state.screenShake = 0.38;
    spawnExplosion(p.x, p.y, '#ef3349', '#fbbd23', 32);
    audio.playerHit();

    if (state.lives <= 0) {
      triggerGameOver();
    } else {
      p.x = W / 2;
      p.y = H - 56;
      p.thrust = 0;
      p.rapidTimer = 0;
      p.invulnTimer = 2.6;
      updateHud();
    }
  }

  /* =========================================================================
   * 9. GAME LIFECYCLE (Start, Pause, GameOver)
   * ========================================================================= */
  function startNewGame() {
    resizeCanvas();
    state.score = 0;
    state.stage = 1;
    state.lives = 3;
    state.bombs = 2;
    state.shotsFired = 0;
    state.shotsHit = 0;
    state.nextExtraLifeScore = 20000;
    state.bullets = [];
    state.enemyBullets = [];
    state.capsules = [];
    state.particles = [];
    state.popups = [];
    state.player = createPlayer();
    state.mode = 'playing';

    startScreenEl.hidden = true;
    pauseScreenEl.hidden = true;
    gameoverScreenEl.hidden = true;

    spawnStage(1);
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
    lastTimestamp = performance.now();
    updateHud();
  }

  function triggerGameOver() {
    state.mode = 'gameover';
    updateHud();
    const acc = state.shotsFired > 0 ? Math.round((state.shotsHit / state.shotsFired) * 100) : 0;
    finalScoreEl.textContent = state.score.toLocaleString();
    finalStageEl.textContent = String(state.stage);
    finalAccEl.textContent = `${acc}%`;
    gameoverMsgEl.textContent =
      state.score >= state.highScore && state.score > 0
        ? '🏆 신기록 달성! 은하계 최고의 파일럿입니다!'
        : '훌륭한 비행이었습니다. 다시 출격해 기록을 깨보세요!';

    setTimeout(() => {
      if (state.mode === 'gameover') {
        gameoverScreenEl.hidden = false;
      }
    }, 650);
  }

  /* =========================================================================
   * 10. SIMULATION TICK & RENDER LOOP
   * ========================================================================= */
  function launchDiveAttack() {
    const ready = state.enemies.filter((e) => e.state === 'formation');
    if (ready.length === 0) return;

    const diver = ready[Math.floor(Math.random() * ready.length)];
    audio.diveWhistle();

    // Boss Galaga has a 38% chance to perform a Tractor Beam dive!
    if (diver.type === 'boss' && Math.random() < 0.38) {
      diver.state = 'tractor';
      diver.diveTime = 0;
      diver.tractorTimer = 0;
      diver.diveStartX = diver.x;
      diver.targetX = Math.max(48, Math.min(W - 48, state.player ? state.player.x : W / 2));
      return;
    }

    diver.state = 'diving';
    diver.diveTime = 0;
    diver.diveStartX = diver.x;
    diver.shotCount = 0;
    diver.diveDir = state.player && state.player.x > diver.x ? 1 : -1;

    // If Boss dives normally, bring 1 escort butterfly if nearby!
    if (diver.type === 'boss') {
      const escort = ready.find((e) => e !== diver && e.type === 'butterfly' && Math.abs(e.baseX - diver.baseX) < 60);
      if (escort) {
        escort.state = 'diving';
        escort.diveTime = -0.15;
        escort.diveStartX = escort.x;
        escort.shotCount = 0;
        escort.diveDir = diver.diveDir;
      }
    }
  }

  function update(dt) {
    // Always scroll arcade background starfield
    const warpMult = state.mode === 'playing' && state.isBonusStage ? 1.7 : 1.0;
    for (let i = 0; i < state.stars.length; i++) {
      const s = state.stars[i];
      s.y += s.speed * warpMult * dt;
      if (s.y > H + 4) {
        s.y = -4;
        s.x = Math.random() * W;
      }
    }

    if (state.mode !== 'playing') return;

    state.swayTime += dt;
    if (state.screenShake > 0) state.screenShake = Math.max(0, state.screenShake - dt);

    if (state.shockwave) {
      state.shockwave.r += 920 * dt;
      if (state.shockwave.r >= state.shockwave.maxR) state.shockwave = null;
    }

    // Player update (Full 2D flight: forward/backward + left/right)
    const p = state.player;
    if (p) {
      if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - dt);
      if (p.rapidTimer > 0) {
        p.rapidTimer = Math.max(0, p.rapidTimer - dt);
        if (p.rapidTimer === 0) updateHud();
      }
      if (p.fireCooldown > 0) p.fireCooldown = Math.max(0, p.fireCooldown - dt);

      const moveX = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      const moveY = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      if (moveX !== 0 || moveY !== 0) {
        const len = Math.hypot(moveX, moveY) || 1;
        const marginX = p.dual ? 34 : 20;
        p.x = Math.max(marginX, Math.min(W - marginX, p.x + (moveX / len) * 310 * dt));
        p.y = Math.max(58, Math.min(H - 34, p.y + (moveY / len) * 300 * dt));
        p.thrust = moveY < 0 ? 1 : moveY > 0 ? -1 : 0;
      } else if (!touchState.active) {
        p.thrust = 0;
      }

      if (state.autoFire || keys.shoot) {
        firePlayerLaser();
      }
    }

    // Player bullets
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.y += b.vy * dt;
      if (b.y < -20) state.bullets.splice(i, 1);
    }

    // Formation breathing sway offset
    const swayOffset = Math.sin(state.swayTime * 1.9) * 16;
    const breathScale = 1 + Math.sin(state.swayTime * 3.1) * 0.035;

    // Dive scheduler
    if (!state.isBonusStage) {
      state.diveCooldown -= dt;
      if (state.diveCooldown <= 0) {
        launchDiveAttack();
        state.diveCooldown = Math.max(0.65, 2.25 - state.stage * 0.14);
      }
    }

    // Enemies update
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const en = state.enemies[i];
      if (en.delay > 0) {
        en.delay -= dt;
        continue;
      }

      const targetFormX = W / 2 + (en.baseX - W / 2) * breathScale + swayOffset;
      const targetFormY = en.baseY;

      if (en.state === 'bonus_path') {
        en.pathT += en.pathSpeed * dt;
        if (en.pathT >= 1) {
          state.enemies.splice(i, 1);
          continue;
        }
        const pos = cubicBezier(en.p0, en.p1, en.p2, en.p3, en.pathT);
        en.angle = Math.atan2(pos.y - en.y, pos.x - en.x) + Math.PI / 2;
        en.x = pos.x;
        en.y = pos.y;
      } else if (en.state === 'entering') {
        en.p3.x = targetFormX;
        en.p3.y = targetFormY;
        en.pathT = Math.min(1, en.pathT + en.pathSpeed * dt);
        const pos = cubicBezier(en.p0, en.p1, en.p2, en.p3, en.pathT);
        en.angle = Math.atan2(pos.y - en.y, pos.x - en.x) + Math.PI / 2;
        en.x = pos.x;
        en.y = pos.y;
        if (en.pathT >= 1) {
          en.state = 'formation';
          en.angle = 0;
        }
      } else if (en.state === 'formation') {
        en.x += (targetFormX - en.x) * Math.min(1, 10 * dt);
        en.y += (targetFormY - en.y) * Math.min(1, 10 * dt);
        en.angle = 0;
      } else if (en.state === 'diving') {
        en.diveTime += dt;
        if (en.diveTime >= 0) {
          const diveSpeed = 175 + Math.min(110, state.stage * 14);
          const prevX = en.x;
          const prevY = en.y;
          en.y += diveSpeed * dt;
          en.x =
            en.diveStartX +
            Math.sin(en.diveTime * 3.3) * 68 * en.diveDir +
            (p ? (p.x - en.diveStartX) * Math.min(0.45, en.diveTime * 0.25) : 0);
          en.x = Math.max(18, Math.min(W - 18, en.x));
          en.angle = Math.atan2(en.y - prevY, en.x - prevX) + Math.PI / 2;

          // Shoot aimed bullet during dive
          const maxDiveShots = state.stage >= 4 ? 2 : 1;
          if (en.shotCount < maxDiveShots && en.y > 110 && en.y < H - 140 && Math.random() < 2.2 * dt) {
            en.shotCount++;
            const aimAngle = p ? Math.atan2(p.y - en.y, p.x - en.x) : Math.PI / 2;
            const bSpd = 235 + Math.min(115, state.stage * 12);
            state.enemyBullets.push({
              x: en.x,
              y: en.y + 12,
              vx: Math.cos(aimAngle) * bSpd,
              vy: Math.sin(aimAngle) * bSpd
            });
          }

          // Wrap from bottom back into formation from top
          if (en.y > H + 28) {
            en.y = -24;
            en.state = 'entering';
            en.p0 = { x: en.x, y: -24 };
            en.p1 = { x: en.x, y: 30 };
            en.p2 = { x: targetFormX, y: targetFormY - 30 };
            en.p3 = { x: targetFormX, y: targetFormY };
            en.pathT = 0;
            en.pathSpeed = 1.35;
          }
        }
      } else if (en.state === 'tractor') {
        const hoverY = Math.max(170, H - 220);
        if (en.tractorTimer === 0 && en.y < hoverY) {
          en.y += 195 * dt;
          en.x += (en.targetX - en.x) * 3.2 * dt;
          en.angle = 0;
          if (en.y >= hoverY) {
            en.y = hoverY;
            en.tractorTimer = 2.4;
          }
        } else if (en.tractorTimer > 0) {
          en.tractorTimer -= dt;
          const beamBottom = H - 24;
          // Check if player touches the tractor beam cone below the Boss
          if (p && Math.abs(p.x - en.x) < 30 && p.y > en.y + 8 && p.y < beamBottom) {
            damagePlayer();
            en.tractorTimer = 0;
          }
          if (en.tractorTimer <= 0) {
            en.tractorTimer = -1; // retreat back up
          }
        } else {
          en.y -= 185 * dt;
          en.x += (targetFormX - en.x) * 3.5 * dt;
          if (en.y <= targetFormY + 6) {
            en.state = 'formation';
            en.tractorTimer = 0;
          }
        }
      }

      // Bullet vs Enemy collision
      for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
        const b = state.bullets[bi];
        if (Math.abs(b.x - en.x) < 16 && Math.abs(b.y - en.y) < 15) {
          state.bullets.splice(bi, 1);
          state.shotsHit++;
          en.hp--;
          if (en.hp <= 0) {
            destroyEnemy(i, false);
            break;
          } else {
            audio.enemyArmor();
            addScore(50, en.x, en.y - 10, 'ARMOR!', '#38bdf8');
          }
        }
      }
    }

    // Enemy vs Player body collision
    if (p && p.invulnTimer <= 0) {
      const hitHalfW = p.dual ? 24 : 13;
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const en = state.enemies[i];
        if (en.delay > 0) continue;
        if (Math.abs(en.x - p.x) < hitHalfW + 11 && Math.abs(en.y - p.y) < 18) {
          destroyEnemy(i, true);
          damagePlayer();
          break;
        }
      }
    }

    // Enemy bullets update & collision
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
      const eb = state.enemyBullets[i];
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;
      if (eb.y > H + 20 || eb.y < -20 || eb.x < -20 || eb.x > W + 20) {
        state.enemyBullets.splice(i, 1);
        continue;
      }
      if (p && p.invulnTimer <= 0) {
        const hitW = p.dual ? 22 : 11;
        if (Math.abs(eb.x - p.x) < hitW && Math.abs(eb.y - p.y) < 13) {
          state.enemyBullets.splice(i, 1);
          damagePlayer();
        }
      }
    }

    // Power-up capsules update
    for (let i = state.capsules.length - 1; i >= 0; i--) {
      const cap = state.capsules[i];
      cap.y += cap.vy * dt;
      cap.pulse += dt * 6;
      if (cap.y > H + 24) {
        state.capsules.splice(i, 1);
        continue;
      }
      if (p && Math.abs(cap.x - p.x) < (p.dual ? 30 : 20) && Math.abs(cap.y - p.y) < 20) {
        state.capsules.splice(i, 1);
        applyCapsule(cap);
      }
    }

    // Particles & score popups
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const pt = state.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }

    for (let i = state.popups.length - 1; i >= 0; i--) {
      const pop = state.popups[i];
      pop.y -= 34 * dt;
      pop.life -= dt;
      if (pop.life <= 0) state.popups.splice(i, 1);
    }

    // Check Stage Clear
    if (state.enemies.length === 0 && !state.stageClearPending) {
      state.stageClearPending = true;
      state.stageClearTimer = 1.65;

      if (state.isBonusStage) {
        if (state.bonusKilledCount >= state.bonusSpawnedCount) {
          addScore(10000, W / 2, H * 0.42, 'PERFECT! +10,000', '#24d2ee');
          showWaveBanner('PERFECT CLEAR!', '24기 전원 격추 보너스 +10,000점!');
        } else {
          const bonus = state.bonusKilledCount * 100;
          addScore(bonus, W / 2, H * 0.42, `HITS ${state.bonusKilledCount} (+${bonus})`, '#fbbd23');
          showWaveBanner('CHALLENGE RESULT', `${state.bonusKilledCount} / ${state.bonusSpawnedCount} 격추 (+${bonus}점)`);
        }
      }
    }

    if (state.stageClearPending) {
      state.stageClearTimer -= dt;
      if (state.stageClearTimer <= 0) {
        state.stage++;
        spawnStage(state.stage);
      }
    }
  }

  function render() {
    ctx.save();
    ctx.clearRect(0, 0, W, H);

    if (state.screenShake > 0) {
      const mag = state.screenShake * 14;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }

    // 1. Twinkling Arcade Starfield
    const nowSec = performance.now() * 0.004;
    for (let i = 0; i < state.stars.length; i++) {
      const s = state.stars[i];
      if (Math.sin(nowSec + s.blinkOffset) < -0.55) continue;
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x % W, s.y, s.size, s.size);
    }

    // 2. Hyper-Nova Shockwave Ring
    if (state.shockwave) {
      ctx.save();
      ctx.strokeStyle = 'rgba(36, 210, 238, 0.75)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(state.shockwave.x, state.shockwave.y, state.shockwave.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Boss Tractor Beams
    state.enemies.forEach((en) => {
      if (en.state === 'tractor' && en.tractorTimer > 0) {
        const beamH = Math.max(80, H - 28 - (en.y + 12));
        const grad = ctx.createLinearGradient(en.x, en.y + 12, en.x, en.y + 12 + beamH);
        grad.addColorStop(0, 'rgba(36, 210, 238, 0.55)');
        grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.28)');
        grad.addColorStop(1, 'rgba(36, 210, 238, 0.06)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(en.x - 8, en.y + 12);
        ctx.lineTo(en.x + 8, en.y + 12);
        ctx.lineTo(en.x + 38, en.y + 12 + beamH);
        ctx.lineTo(en.x - 38, en.y + 12 + beamH);
        ctx.closePath();
        ctx.fill();

        // Animated tractor wave arcs
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.72)';
        ctx.lineWidth = 1.6;
        for (let r = 0; r < 5; r++) {
          const prog = ((nowSec * 0.9 + r * 0.2) % 1);
          const ry = en.y + 16 + prog * beamH;
          const rw = 8 + prog * 28;
          ctx.beginPath();
          ctx.arc(en.x, ry, rw, 0.15 * Math.PI, 0.85 * Math.PI);
          ctx.stroke();
        }
      }
    });

    // 4. Enemies
    const flapFrame = Math.floor(nowSec * 1.4) % 2 === 0;
    for (let i = 0; i < state.enemies.length; i++) {
      const en = state.enemies[i];
      if (en.delay > 0) continue;

      let sprite;
      if (en.type === 'boss') {
        sprite = en.hp === 1 ? SPRITES.bossHurt : flapFrame ? SPRITES.boss1 : SPRITES.boss2;
      } else if (en.type === 'butterfly') {
        sprite = flapFrame ? SPRITES.butterfly1 : SPRITES.butterfly2;
      } else {
        sprite = flapFrame ? SPRITES.wasp1 : SPRITES.wasp2;
      }

      ctx.save();
      ctx.translate(en.x, en.y);
      if (en.angle !== 0) ctx.rotate(en.angle);
      ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
      ctx.restore();
    }

    // 5. Player Starfighter (Single or Dual Fighter + Shield)
    const p = state.player;
    if (p && state.mode !== 'gameover') {
      const blinkSkip = p.invulnTimer > 0 && Math.floor(nowSec * 5) % 2 === 0;
      if (!blinkSkip) {
        const drawFighterAt = (fx, fy) => {
          ctx.drawImage(SPRITES.player, fx - SPRITES.player.width / 2, fy - SPRITES.player.height / 2);
          // Dynamic afterburner thruster jet (boosts longer when flying forward!)
          const boostExtra = p.thrust > 0 ? 6 : p.thrust < 0 ? -2 : 0;
          const jetH = Math.max(3, 5 + boostExtra + (Math.floor(nowSec * 6) % 5));
          ctx.fillStyle = p.thrust > 0 ? '#24d2ee' : '#fbbd23';
          ctx.fillRect(fx - 7, fy + 13, 3, jetH);
          ctx.fillRect(fx + 4, fy + 13, 3, jetH);
        };

        if (p.dual) {
          drawFighterAt(p.x - 15, p.y);
          drawFighterAt(p.x + 15, p.y);
        } else {
          drawFighterAt(p.x, p.y);
        }

        if (p.shield) {
          ctx.save();
          ctx.strokeStyle = 'rgba(36, 210, 238, 0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.dual ? 32 : 21, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // 6. Player Lasers
    for (let i = 0; i < state.bullets.length; i++) {
      const b = state.bullets[i];
      ctx.fillStyle = '#fbbd23';
      ctx.fillRect(b.x - 2, b.y - 8, 4, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x - 1, b.y - 8, 2, 7);
    }

    // 7. Enemy Plasma Bolts
    for (let i = 0; i < state.enemyBullets.length; i++) {
      const eb = state.enemyBullets[i];
      ctx.fillStyle = '#ef3349';
      ctx.fillRect(eb.x - 3, eb.y - 5, 6, 10);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(eb.x - 1.5, eb.y - 3, 3, 6);
    }

    // 8. Power-Up Capsules
    for (let i = 0; i < state.capsules.length; i++) {
      const cap = state.capsules[i];
      const r = 11 + Math.sin(cap.pulse) * 1.5;
      ctx.fillStyle = 'rgba(10, 15, 28, 0.9)';
      ctx.beginPath();
      ctx.arc(cap.x, cap.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = cap.color;
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.fillStyle = cap.color;
      ctx.font = 'bold 12px Silkscreen, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cap.label, cap.x, cap.y + 1);
    }

    // 9. Explosion Pixel Particles
    for (let i = 0; i < state.particles.length; i++) {
      const pt = state.particles[i];
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    // 10. Floating Score Popups
    ctx.font = 'bold 12px Silkscreen, monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < state.popups.length; i++) {
      const pop = state.popups[i];
      ctx.globalAlpha = Math.max(0, pop.life / pop.maxLife);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  let lastTimestamp = performance.now();
  function mainLoop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastTimestamp) / 1000));
    lastTimestamp = now;
    update(dt);
    render();
    requestAnimationFrame(mainLoop);
  }

  resizeCanvas();
  initStars();
  updateHud();
  requestAnimationFrame(mainLoop);
})();
