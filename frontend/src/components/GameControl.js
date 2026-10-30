'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { MATRIX_WIDTH, MATRIX_HEIGHT, TOTAL_LEDS, createEmptyGrid } from '../lib/imageProcessor';
import { sendCommand } from '../lib/api';

// =========================================================================
// Retro Sound Synthesizer (Native Web Audio API)
// =========================================================================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playTone(freq, duration = 0.08, type = 'square') {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.09, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  score() {
    this.playTone(587, 0.06, 'square');
    setTimeout(() => this.playTone(880, 0.1, 'square'), 60);
  }

  fire() {
    this.playTone(750, 0.04, 'sawtooth');
  }

  hit() {
    this.playTone(180, 0.12, 'sawtooth');
  }

  gameOver() {
    this.playTone(280, 0.12, 'sawtooth');
    setTimeout(() => this.playTone(200, 0.15, 'sawtooth'), 100);
    setTimeout(() => this.playTone(140, 0.3, 'sawtooth'), 220);
  }
}

const sfx = new SoundFX();

// =========================================================================
// Game Metadata
// =========================================================================
const GAMES = [
  { id: 'snake', name: 'Cyber Snake', icon: '🐍', tag: '30×10 Calibrated' },
  { id: 'pong', name: 'Cyber Pong', icon: '🏓', tag: 'Solo Wall Bounce' },
  { id: 'defender', name: 'Galaxy Defender', icon: '🚀', tag: 'Space Shooter' },
  { id: 'breaker', name: 'Brick Breaker', icon: '🧱', tag: 'Retro Breakout' }
];

function GameControl({ onFrameUpdate, onToast }) {
  const [activeGame, setActiveGame] = useState('snake');
  const [gameState, setGameState] = useState('ready'); // 'ready' | 'playing' | 'paused' | 'gameover'
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [speedLevel, setSpeedLevel] = useState('normal'); // 'slow' | 'normal' | 'fast'
  const [wallMode, setWallMode] = useState('wrap'); // 'wrap' (Arcade 30x10) | 'solid' (Hardcore)
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [syncToMatrix, setSyncToMatrix] = useState(true);
  const [matrixStatus, setMatrixStatus] = useState('Ready');

  // References
  const gameLoopRef = useRef(null);
  const isTransmittingRef = useRef(false);
  const lastTransmitTimeRef = useRef(0);
  const networkBackoffUntilRef = useRef(0);
  const pendingFrameRef = useRef(null);

  // Mutable Game Engine State
  const stateRef = useRef({
    // Snake (Calibrated for 30x10)
    snake: [{ x: 10, y: 5 }, { x: 9, y: 5 }, { x: 8, y: 5 }],
    snakeDir: 'RIGHT',
    snakeInputQueue: [],
    snakeFood: { x: 22, y: 5 },
    snakeEatFlash: null,

    // Pong
    pongPaddleY: 3,
    pongPaddleH: 3,
    pongBall: { x: 15, y: 5, vx: 1, vy: 1 },

    // Defender
    defPlayerY: 4,
    defBullets: [],
    defEnemies: [],
    defTickCounter: 0,

    // Breaker
    breakPaddleX: 13,
    breakPaddleW: 5,
    breakBall: { x: 15, y: 8, vx: 1, vy: -1 },
    breakBricks: []
  });

  // Load High Score
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`matrix_highscore_${activeGame}`);
      setHighScore(stored ? parseInt(stored, 10) : 0);
    } catch (e) {}
  }, [activeGame]);

  const updateHighScore = useCallback((newScore) => {
    setHighScore((prev) => {
      if (newScore > prev) {
        try {
          localStorage.setItem(`matrix_highscore_${activeGame}`, newScore.toString());
        } catch (e) {}
        return newScore;
      }
      return prev;
    });
  }, [activeGame]);

  // Gentle Haptic Feedback
  const triggerHaptic = (ms = 18) => {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  };

  // =========================================================================
  // Non-Blocking Decoupled Hardware Matrix Transmitter
  // =========================================================================
  const pushFrameToHardware = useCallback((pixels) => {
    if (!syncToMatrix) return;
    pendingFrameRef.current = pixels;

    const now = Date.now();
    if (now < networkBackoffUntilRef.current) return;
    if (now - lastTransmitTimeRef.current < 200) return;
    if (isTransmittingRef.current) return;

    lastTransmitTimeRef.current = now;
    isTransmittingRef.current = true;

    const frameData = pendingFrameRef.current;
    sendCommand('image', { pixels: frameData }, { timeoutMs: 1500 })
      .then(() => {
        setMatrixStatus('Synced 🟢');
      })
      .catch(() => {
        networkBackoffUntilRef.current = Date.now() + 2000;
        setMatrixStatus('Offline / Paused ⚪');
      })
      .finally(() => {
        isTransmittingRef.current = false;
      });
  }, [syncToMatrix]);

  // =========================================================================
  // Speed Calibrations for 30x10 Matrix
  // =========================================================================
  const getSpeedMs = () => {
    if (activeGame === 'snake') {
      // 30x10 Matrix requires tuned speeds: 10 rows is narrow
      if (speedLevel === 'slow') return 210;   // Matrix Relaxed
      if (speedLevel === 'fast') return 110;   // Matrix Turbo
      return 155;                             // Matrix Standard (Default)
    }
    if (activeGame === 'pong') {
      if (speedLevel === 'slow') return 120;
      if (speedLevel === 'fast') return 65;
      return 90;
    }
    if (activeGame === 'defender') {
      if (speedLevel === 'slow') return 110;
      if (speedLevel === 'fast') return 55;
      return 75;
    }
    if (activeGame === 'breaker') {
      if (speedLevel === 'slow') return 110;
      if (speedLevel === 'fast') return 65;
      return 85;
    }
    return 140;
  };

  // Safe Food Spawning on 30x10 Grid (at least 4 units from head)
  const spawnFood = (snake) => {
    const head = (snake && snake[0]) || { x: 15, y: 5 };
    let attempts = 0;
    while (attempts < 300) {
      const candidate = {
        x: Math.floor(Math.random() * MATRIX_WIDTH),
        y: Math.floor(Math.random() * MATRIX_HEIGHT)
      };
      const onSnake = snake.some((s) => s.x === candidate.x && s.y === candidate.y);
      const distFromHead = Math.abs(candidate.x - head.x) + Math.abs(candidate.y - head.y);
      if (!onSnake && distFromHead >= 4) {
        return candidate;
      }
      attempts++;
    }
    return { x: (head.x + 8) % MATRIX_WIDTH, y: (head.y + 4) % MATRIX_HEIGHT };
  };

  const initGame = useCallback((gameId = activeGame) => {
    const s = stateRef.current;
    setScore(0);

    if (gameId === 'snake') {
      // Start in center-left moving horizontally towards right (30 cols gives plenty of space)
      s.snake = [{ x: 10, y: 5 }, { x: 9, y: 5 }, { x: 8, y: 5 }];
      s.snakeDir = 'RIGHT';
      s.snakeInputQueue = [];
      s.snakeFood = spawnFood(s.snake);
      s.snakeEatFlash = null;
    } else if (gameId === 'pong') {
      setLives(3);
      s.pongPaddleY = 3;
      s.pongBall = { x: 15, y: 5, vx: Math.random() > 0.5 ? 1 : -1, vy: Math.random() > 0.5 ? 1 : -1 };
    } else if (gameId === 'defender') {
      setLives(3);
      s.defPlayerY = 4;
      s.defBullets = [];
      s.defEnemies = [];
      s.defTickCounter = 0;
    } else if (gameId === 'breaker') {
      setLives(3);
      s.breakPaddleX = 12;
      s.breakBall = { x: 15, y: 7, vx: 1, vy: -1 };
      const bricks = [];
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < MATRIX_WIDTH; x++) {
          bricks.push({ x, y, active: true, color: y === 0 ? [255, 0, 128] : [0, 240, 255] });
        }
      }
      s.breakBricks = bricks;
    }

    renderCurrentGame(gameId);
  }, [activeGame]);

  // =========================================================================
  // 30x10 LED Matrix Game Renderers
  // Calibrated colors for physical WS2812B LEDs (high contrast)
  // =========================================================================
  const renderCurrentGame = useCallback((gameId = activeGame) => {
    const s = stateRef.current;
    const grid = createEmptyGrid();

    const setPixel = (x, y, rgb) => {
      if (x >= 0 && x < MATRIX_WIDTH && y >= 0 && y < MATRIX_HEIGHT) {
        const idx = y * MATRIX_WIDTH + x;
        grid[idx] = rgb;
      }
    };

    if (gameId === 'snake') {
      // 1. Food: Blinking Pulsing Neon Cherry Red for physical matrix visibility
      const foodBlink = Math.floor(Date.now() / 250) % 2 === 0;
      setPixel(s.snakeFood.x, s.snakeFood.y, foodBlink ? [255, 0, 75] : [140, 0, 35]);

      // 2. Snake Body: Gradient emerald neon green (tail tip is darker green)
      for (let i = 1; i < s.snake.length; i++) {
        const seg = s.snake[i];
        const ratio = 1 - i / Math.max(s.snake.length, 1);
        const g = Math.round(150 + 105 * ratio); // 150 to 255
        const b = Math.round(20 + 50 * ratio);   // 20 to 70
        setPixel(seg.x, seg.y, [0, g, b]);
      }

      // 3. Snake Head: Pure High-Contrast White / Cyan (unmistakable on 30x10 board)
      if (s.snake.length > 0) {
        setPixel(s.snake[0].x, s.snake[0].y, [255, 255, 255]);
      }

      // 4. Eat Effect: Gold flash
      if (s.snakeEatFlash && s.snakeEatFlash.ticks > 0) {
        setPixel(s.snakeEatFlash.x, s.snakeEatFlash.y, [255, 230, 0]);
        s.snakeEatFlash.ticks--;
      }
    } else if (gameId === 'pong') {
      for (let i = 0; i < s.pongPaddleH; i++) {
        setPixel(0, s.pongPaddleY + i, [0, 240, 255]);
      }
      setPixel(Math.round(s.pongBall.x), Math.round(s.pongBall.y), [255, 240, 0]);
      for (let y = 0; y < MATRIX_HEIGHT; y += 2) {
        setPixel(MATRIX_WIDTH - 1, y, [15, 25, 45]);
      }
    } else if (gameId === 'defender') {
      setPixel(0, s.defPlayerY, [255, 120, 0]);
      setPixel(1, s.defPlayerY, [0, 240, 255]);
      setPixel(2, s.defPlayerY, [255, 255, 255]);
      s.defBullets.forEach((b) => setPixel(b.x, b.y, [255, 0, 150]));
      s.defEnemies.forEach((e) => setPixel(e.x, e.y, e.color || [255, 50, 70]));
    } else if (gameId === 'breaker') {
      s.breakBricks.forEach((b) => {
        if (b.active) setPixel(b.x, b.y, b.color);
      });
      for (let i = 0; i < s.breakPaddleW; i++) {
        setPixel(s.breakPaddleX + i, MATRIX_HEIGHT - 1, [0, 240, 255]);
      }
      setPixel(Math.round(s.breakBall.x), Math.round(s.breakBall.y), [255, 240, 0]);
    }

    // Immediately update Live Canvas Simulator
    if (onFrameUpdate) onFrameUpdate(grid);

    // Stream to Hardware Matrix
    pushFrameToHardware(grid);
  }, [activeGame, onFrameUpdate, pushFrameToHardware]);

  // =========================================================================
  // Game Step: Cyber Snake (Matrix-Optimized)
  // =========================================================================
  const tickSnake = () => {
    const s = stateRef.current;

    // Pop next queued direction
    if (s.snakeInputQueue.length > 0) {
      s.snakeDir = s.snakeInputQueue.shift();
    }

    const head = { ...s.snake[0] };
    if (s.snakeDir === 'UP') head.y--;
    else if (s.snakeDir === 'DOWN') head.y++;
    else if (s.snakeDir === 'LEFT') head.x--;
    else if (s.snakeDir === 'RIGHT') head.x++;

    // Wall Handling for 30x10 Matrix
    if (wallMode === 'wrap') {
      // Wrap-Around (Torus): Allows continuous play in narrow 10-row space
      if (head.x < 0) head.x = MATRIX_WIDTH - 1;
      else if (head.x >= MATRIX_WIDTH) head.x = 0;
      if (head.y < 0) head.y = MATRIX_HEIGHT - 1;
      else if (head.y >= MATRIX_HEIGHT) head.y = 0;
    } else {
      // Solid Walls (Hardcore)
      if (head.x < 0 || head.x >= MATRIX_WIDTH || head.y < 0 || head.y >= MATRIX_HEIGHT) {
        handleGameOver();
        return;
      }
    }

    // Self Collision Check
    if (s.snake.some((seg) => seg.x === head.x && seg.y === head.y)) {
      handleGameOver();
      return;
    }

    const newSnake = [head, ...s.snake];

    // Food Eaten?
    if (head.x === s.snakeFood.x && head.y === s.snakeFood.y) {
      sfx.score();
      triggerHaptic(30);
      s.snakeEatFlash = { x: head.x, y: head.y, ticks: 2 };
      setScore((sc) => {
        const next = sc + 10;
        updateHighScore(next);
        return next;
      });
      s.snakeFood = spawnFood(newSnake);
    } else {
      newSnake.pop();
    }

    s.snake = newSnake;
    renderCurrentGame('snake');
  };

  const tickPong = () => {
    const s = stateRef.current;
    let { x, y, vx, vy } = s.pongBall;

    x += vx;
    y += vy;

    if (y <= 0) { y = 0; vy = -vy; }
    else if (y >= MATRIX_HEIGHT - 1) { y = MATRIX_HEIGHT - 1; vy = -vy; }

    if (x >= MATRIX_WIDTH - 1) { x = MATRIX_WIDTH - 1; vx = -vx; }

    if (x <= 1) {
      if (y >= s.pongPaddleY && y < s.pongPaddleY + s.pongPaddleH) {
        x = 1;
        vx = Math.abs(vx);
        sfx.score();
        triggerHaptic(25);
        setScore((sc) => {
          const next = sc + 5;
          updateHighScore(next);
          return next;
        });
      } else if (x < 0) {
        sfx.hit();
        triggerHaptic(60);
        setLives((lv) => {
          const rem = lv - 1;
          if (rem <= 0) handleGameOver();
          else s.pongBall = { x: 15, y: 5, vx: 1, vy: Math.random() > 0.5 ? 1 : -1 };
          return rem;
        });
        return;
      }
    }

    s.pongBall = { x, y, vx, vy };
    renderCurrentGame('pong');
  };

  const tickDefender = () => {
    const s = stateRef.current;
    s.defTickCounter++;

    const newBullets = [];
    s.defBullets.forEach((b) => {
      const nextX = b.x + 2;
      if (nextX < MATRIX_WIDTH) newBullets.push({ x: nextX, y: b.y });
    });

    if (s.defTickCounter % 6 === 0) {
      const spawnY = Math.floor(Math.random() * MATRIX_HEIGHT);
      s.defEnemies.push({
        x: MATRIX_WIDTH - 1,
        y: spawnY,
        color: Math.random() > 0.5 ? [255, 60, 60] : [255, 170, 0]
      });
    }

    let enemies = s.defEnemies;
    if (s.defTickCounter % 2 === 0) {
      const movedEnemies = [];
      for (const e of enemies) {
        const nextX = e.x - 1;
        if (nextX <= 2 && e.y === s.defPlayerY) {
          sfx.hit();
          triggerHaptic(50);
          setLives((lv) => {
            const rem = lv - 1;
            if (rem <= 0) handleGameOver();
            return rem;
          });
        } else if (nextX > 0) {
          movedEnemies.push({ ...e, x: nextX });
        }
      }
      enemies = movedEnemies;
    }

    const survivingBullets = [];
    const survivingEnemies = [...enemies];

    newBullets.forEach((bullet) => {
      let hit = false;
      for (let i = 0; i < survivingEnemies.length; i++) {
        const enemy = survivingEnemies[i];
        if (Math.abs(bullet.x - enemy.x) <= 1 && bullet.y === enemy.y) {
          hit = true;
          sfx.score();
          triggerHaptic(30);
          setScore((sc) => {
            const next = sc + 10;
            updateHighScore(next);
            return next;
          });
          survivingEnemies.splice(i, 1);
          break;
        }
      }
      if (!hit) survivingBullets.push(bullet);
    });

    s.defBullets = survivingBullets;
    s.defEnemies = survivingEnemies;
    renderCurrentGame('defender');
  };

  const tickBreaker = () => {
    const s = stateRef.current;
    let { x, y, vx, vy } = s.breakBall;

    x += vx;
    y += vy;

    if (x <= 0) { x = 0; vx = -vx; }
    else if (x >= MATRIX_WIDTH - 1) { x = MATRIX_WIDTH - 1; vx = -vx; }

    if (y <= 0) { y = 0; vy = -vy; }

    const ballRoundX = Math.round(x);
    const ballRoundY = Math.round(y);
    const hitBrick = s.breakBricks.find(
      (b) => b.active && b.x === ballRoundX && b.y === ballRoundY
    );

    if (hitBrick) {
      hitBrick.active = false;
      vy = -vy;
      sfx.score();
      triggerHaptic(25);
      setScore((sc) => {
        const next = sc + 15;
        updateHighScore(next);
        return next;
      });

      if (s.breakBricks.every((b) => !b.active)) {
        sfx.score();
        onToast({ type: 'success', message: '🏆 YOU CLEARED ALL BRICKS!' });
        handleGameOver();
        return;
      }
    }

    if (y >= MATRIX_HEIGHT - 1) {
      if (x >= s.breakPaddleX && x < s.breakPaddleX + s.breakPaddleW) {
        y = MATRIX_HEIGHT - 2;
        vy = -Math.abs(vy);
        triggerHaptic(20);
      } else {
        sfx.hit();
        triggerHaptic(60);
        setLives((lv) => {
          const rem = lv - 1;
          if (rem <= 0) handleGameOver();
          else s.breakBall = { x: s.breakPaddleX + 2, y: 7, vx: 1, vy: -1 };
          return rem;
        });
        return;
      }
    }

    s.breakBall = { x, y, vx, vy };
    renderCurrentGame('breaker');
  };

  // Main Loop Dispatcher
  const gameStep = useCallback(() => {
    if (activeGame === 'snake') tickSnake();
    else if (activeGame === 'pong') tickPong();
    else if (activeGame === 'defender') tickDefender();
    else if (activeGame === 'breaker') tickBreaker();
  }, [activeGame, wallMode]);

  const handleGameOver = () => {
    setGameState('gameover');
    sfx.gameOver();
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);

    // Death Flash on Matrix (bright red crash)
    const s = stateRef.current;
    const deathGrid = createEmptyGrid();
    if (activeGame === 'snake') {
      s.snake.forEach((seg) => {
        const idx = seg.y * MATRIX_WIDTH + seg.x;
        if (idx >= 0 && idx < TOTAL_LEDS) deathGrid[idx] = [255, 0, 0];
      });
      if (onFrameUpdate) onFrameUpdate(deathGrid);
      pushFrameToHardware(deathGrid);
    }

    if (onToast) {
      onToast({ type: 'warning', message: `Game Over! Final Score: ${score}` });
    }
  };

  const startGame = () => {
    sfx.init();
    if (gameState === 'gameover' || gameState === 'ready') {
      initGame(activeGame);
    }
    setGameState('playing');
  };

  const pauseGame = () => {
    setGameState('paused');
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
  };

  const resetGame = () => {
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    setGameState('ready');
    initGame(activeGame);
  };

  // Interval Manager
  useEffect(() => {
    if (gameState === 'playing') {
      const ms = getSpeedMs();
      gameLoopRef.current = setInterval(gameStep, ms);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState, activeGame, speedLevel, wallMode, gameStep]);

  const switchGame = (gameId) => {
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    setActiveGame(gameId);
    setGameState('ready');
    initGame(gameId);
  };

  // =========================================================================
  // Buffered Mobile Joystick Turn Queue (Prevents missed turns & self-bites)
  // =========================================================================
  const handleSnakeInput = (dir) => {
    const s = stateRef.current;
    triggerHaptic(20);

    const lastPlannedDir = s.snakeInputQueue.length > 0
      ? s.snakeInputQueue[s.snakeInputQueue.length - 1]
      : s.snakeDir;

    // Disallow 180° immediate reverse turn into oneself
    const isOpposite =
      (dir === 'UP' && lastPlannedDir === 'DOWN') ||
      (dir === 'DOWN' && lastPlannedDir === 'UP') ||
      (dir === 'LEFT' && lastPlannedDir === 'RIGHT') ||
      (dir === 'RIGHT' && lastPlannedDir === 'LEFT');

    if (!isOpposite && dir !== lastPlannedDir) {
      if (s.snakeInputQueue.length < 2) {
        s.snakeInputQueue.push(dir);
      }
    }
  };

  const handlePongMove = (delta) => {
    const s = stateRef.current;
    triggerHaptic(15);
    const nextY = Math.max(0, Math.min(MATRIX_HEIGHT - s.pongPaddleH, s.pongPaddleY + delta));
    s.pongPaddleY = nextY;
    renderCurrentGame('pong');
  };

  const handleDefenderMove = (delta) => {
    const s = stateRef.current;
    triggerHaptic(15);
    const nextY = Math.max(0, Math.min(MATRIX_HEIGHT - 1, s.defPlayerY + delta));
    s.defPlayerY = nextY;
    renderCurrentGame('defender');
  };

  const handleDefenderFire = () => {
    const s = stateRef.current;
    triggerHaptic(25);
    sfx.fire();
    s.defBullets.push({ x: 3, y: s.defPlayerY });
    renderCurrentGame('defender');
  };

  const handleBreakerMove = (delta) => {
    const s = stateRef.current;
    triggerHaptic(15);
    const nextX = Math.max(0, Math.min(MATRIX_WIDTH - s.breakPaddleW, s.breakPaddleX + delta));
    s.breakPaddleX = nextX;
    renderCurrentGame('breaker');
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== 'playing') {
        if (e.code === 'Space') {
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (activeGame === 'snake') {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); handleSnakeInput('UP'); }
        else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); handleSnakeInput('DOWN'); }
        else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); handleSnakeInput('LEFT'); }
        else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); handleSnakeInput('RIGHT'); }
      } else if (activeGame === 'pong') {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); handlePongMove(-1); }
        else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); handlePongMove(1); }
      } else if (activeGame === 'defender') {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); handleDefenderMove(-1); }
        else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); handleDefenderMove(1); }
        else if (e.code === 'Space') { e.preventDefault(); handleDefenderFire(); }
      } else if (activeGame === 'breaker') {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); handleBreakerMove(-2); }
        else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); handleBreakerMove(2); }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, activeGame]);

  const createTouchHandler = (actionFn) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      actionFn();
    }
  });

  return (
    <div className="panel-card games-section-container">
      {/* Game Selector Ribbon */}
      <div className="game-tabs-selector">
        {GAMES.map((game) => (
          <button
            key={game.id}
            type="button"
            className={`game-select-card ${activeGame === game.id ? 'active' : ''}`}
            onClick={() => switchGame(game.id)}
          >
            <span className="game-select-icon">{game.icon}</span>
            <div className="game-select-info">
              <span className="game-select-name">{game.name}</span>
              <span className="game-select-tag">{game.tag}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Game HUD Bar */}
      <div className="game-hud-bar">
        <div className="game-hud-metrics">
          <div className="hud-metric-box">
            <span className="hud-metric-label">SCORE</span>
            <span className="hud-metric-val neon-cyan-text">{score}</span>
          </div>

          <div className="hud-metric-box">
            <span className="hud-metric-label">HIGH SCORE</span>
            <span className="hud-metric-val neon-pink-text">{highScore}</span>
          </div>

          {activeGame === 'snake' && (
            <div className="hud-metric-box">
              <span className="hud-metric-label">WALL MODE</span>
              <button
                type="button"
                className="wall-toggle-badge"
                onClick={() => setWallMode(m => m === 'wrap' ? 'solid' : 'wrap')}
                title="Click to toggle wrap-around vs solid walls"
              >
                {wallMode === 'wrap' ? '🌀 Wrap-Around (30×10)' : '🧱 Solid Walls'}
              </button>
            </div>
          )}

          {(activeGame === 'pong' || activeGame === 'defender' || activeGame === 'breaker') && (
            <div className="hud-metric-box">
              <span className="hud-metric-label">LIVES</span>
              <span className="hud-metric-val neon-green-text">
                {'❤️'.repeat(Math.max(0, lives))}
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="game-hud-actions">
          {gameState !== 'playing' ? (
            <button
              type="button"
              className="game-action-btn primary pulse-glow"
              onClick={startGame}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>{gameState === 'paused' ? 'RESUME' : 'START GAME'}</span>
            </button>
          ) : (
            <button
              type="button"
              className="game-action-btn warning"
              onClick={pauseGame}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
              <span>PAUSE</span>
            </button>
          )}

          <button
            type="button"
            className="game-action-btn secondary"
            onClick={resetGame}
            title="Reset Game"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            <span>RESET</span>
          </button>
        </div>
      </div>

      {/* Hardware Sync & Audio Bar */}
      <div className="game-hardware-strip">
        <label className="toggle-switch-wrapper">
          <input
            type="checkbox"
            checked={syncToMatrix}
            onChange={(e) => setSyncToMatrix(e.target.checked)}
          />
          <span className="toggle-slider" />
          <span className="toggle-label">
            Stream to Physical Matrix (30×10 WS2812B)
          </span>
        </label>

        <div className="hardware-stream-badge">
          {syncToMatrix ? (
            <span className="stream-online">
              <span className="status-pulse-dot online" />
              Matrix Link: {matrixStatus}
            </span>
          ) : (
            <span className="stream-paused">⚪ Simulator Only (Fastest)</span>
          )}
        </div>

        <button
          type="button"
          className={`sound-toggle-btn ${soundEnabled ? 'active' : ''}`}
          onClick={() => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            sfx.enabled = next;
          }}
          title={soundEnabled ? 'Sound On' : 'Sound Muted'}
        >
          {soundEnabled ? '🔊 Sound FX' : '🔇 Muted'}
        </button>
      </div>

      {/* ===================================================================
          PHONE RETRO JOYSTICK / GAMEPAD CONSOLE
          =================================================================== */}
      <div className="gamepad-chassis">
        <div className="gamepad-header-row">
          <div className="gamepad-brand-label">
            <span className="gamepad-dpad-icon">🕹️</span>
            <span>VIRTUAL PHONE GAMEPAD — {GAMES.find((g) => g.id === activeGame)?.name.toUpperCase()}</span>
          </div>
          <span className="gamepad-hint-chip">Touch / Click / Keyboard (Arrows/WASD)</span>
        </div>

        {/* 1. SNAKE GAMEPAD: 4-WAY CROSS D-PAD WITH QUEUED TURNS */}
        {activeGame === 'snake' && (
          <div className="dpad-container">
            <div className="dpad-cross">
              <button
                type="button"
                className="dpad-btn dpad-up"
                {...createTouchHandler(() => handleSnakeInput('UP'))}
                aria-label="Up"
              >
                ▲
              </button>
              <div className="dpad-row-middle">
                <button
                  type="button"
                  className="dpad-btn dpad-left"
                  {...createTouchHandler(() => handleSnakeInput('LEFT'))}
                  aria-label="Left"
                >
                  ◀
                </button>
                <div className="dpad-center-hub">
                  <span className="dpad-matrix-badge">30×10</span>
                </div>
                <button
                  type="button"
                  className="dpad-btn dpad-right"
                  {...createTouchHandler(() => handleSnakeInput('RIGHT'))}
                  aria-label="Right"
                >
                  ▶
                </button>
              </div>
              <button
                type="button"
                className="dpad-btn dpad-down"
                {...createTouchHandler(() => handleSnakeInput('DOWN'))}
                aria-label="Down"
              >
                ▼
              </button>
            </div>
          </div>
        )}

        {/* 2. PONG GAMEPAD */}
        {activeGame === 'pong' && (
          <div className="vertical-paddle-gamepad">
            <div className="paddle-instruction">Slide paddle vertically to return the ball</div>
            <div className="paddle-dual-buttons">
              <button
                type="button"
                className="arcade-large-btn cyan-btn"
                {...createTouchHandler(() => handlePongMove(-1))}
              >
                <span className="arcade-btn-arrow">▲</span>
                <span className="arcade-btn-title">SLIDE PADDLE UP</span>
              </button>
              <button
                type="button"
                className="arcade-large-btn cyan-btn"
                {...createTouchHandler(() => handlePongMove(1))}
              >
                <span className="arcade-btn-arrow">▼</span>
                <span className="arcade-btn-title">SLIDE PADDLE DOWN</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. GALAXY DEFENDER GAMEPAD */}
        {activeGame === 'defender' && (
          <div className="dual-hand-controller">
            <div className="hand-cluster">
              <span className="cluster-label">THRUSTERS</span>
              <div className="thrust-button-pair">
                <button
                  type="button"
                  className="arcade-square-btn"
                  {...createTouchHandler(() => handleDefenderMove(-1))}
                >
                  ▲ UP
                </button>
                <button
                  type="button"
                  className="arcade-square-btn"
                  {...createTouchHandler(() => handleDefenderMove(1))}
                >
                  ▼ DOWN
                </button>
              </div>
            </div>

            <div className="hand-cluster">
              <span className="cluster-label">WEAPON SYSTEM</span>
              <button
                type="button"
                className="arcade-fire-btn pulse-glow"
                {...createTouchHandler(handleDefenderFire)}
              >
                <span className="fire-icon">💥</span>
                <span className="fire-label">FIRE LASER</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. BRICK BREAKER GAMEPAD */}
        {activeGame === 'breaker' && (
          <div className="breaker-horizontal-gamepad">
            <div className="paddle-instruction">Move paddle left & right to bounce the ball</div>
            <div className="breaker-steering-pair">
              <button
                type="button"
                className="arcade-large-btn pink-btn"
                {...createTouchHandler(() => handleBreakerMove(-2))}
              >
                <span className="arcade-btn-arrow">◀</span>
                <span className="arcade-btn-title">MOVE LEFT</span>
              </button>
              <button
                type="button"
                className="arcade-large-btn cyan-btn"
                {...createTouchHandler(() => handleBreakerMove(2))}
              >
                <span className="arcade-btn-arrow">▶</span>
                <span className="arcade-btn-title">MOVE RIGHT</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Speed Selector Footer */}
      <div className="game-footer-settings">
        <span className="footer-label">Snake Engine Speed (30×10):</span>
        <div className="speed-pills">
          <button
            type="button"
            className={`speed-pill ${speedLevel === 'slow' ? 'active' : ''}`}
            onClick={() => setSpeedLevel('slow')}
          >
            Matrix Relaxed (210ms)
          </button>
          <button
            type="button"
            className={`speed-pill ${speedLevel === 'normal' ? 'active' : ''}`}
            onClick={() => setSpeedLevel('normal')}
          >
            Matrix Standard (155ms)
          </button>
          <button
            type="button"
            className={`speed-pill ${speedLevel === 'fast' ? 'active' : ''}`}
            onClick={() => setSpeedLevel('fast')}
          >
            Matrix Turbo (110ms) 🔥
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(GameControl);
