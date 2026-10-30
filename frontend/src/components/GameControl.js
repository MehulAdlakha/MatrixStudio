'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { MATRIX_WIDTH, MATRIX_HEIGHT, TOTAL_LEDS, createEmptyGrid } from '../lib/imageProcessor';
import { sendCommand } from '../lib/api';

// =========================================================================
// Retro Sound Synthesizer (Native Web Audio API - Zero External Assets)
// Optimized for zero audio thread lockup on mobile devices
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
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // AudioContext might be blocked until user gesture
    }
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
    this.playTone(300, 0.12, 'sawtooth');
    setTimeout(() => this.playTone(220, 0.15, 'sawtooth'), 100);
    setTimeout(() => this.playTone(150, 0.3, 'sawtooth'), 220);
  }
}

const sfx = new SoundFX();

// =========================================================================
// Game Definitions & Metadata
// =========================================================================
const GAMES = [
  { id: 'snake', name: 'Cyber Snake', icon: '🐍', tag: 'Classic Arcade' },
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [syncToMatrix, setSyncToMatrix] = useState(true);
  const [matrixStatus, setMatrixStatus] = useState('Ready');

  // References for game loop & hardware transmission
  const gameLoopRef = useRef(null);
  const isTransmittingRef = useRef(false);
  const lastTransmitTimeRef = useRef(0);
  const networkBackoffUntilRef = useRef(0);
  const pendingFrameRef = useRef(null);

  // Game internal mutable state (prevents React re-renders on every game tick)
  const stateRef = useRef({
    // Snake
    snake: [{ x: 12, y: 5 }, { x: 11, y: 5 }, { x: 10, y: 5 }],
    snakeDir: 'RIGHT',
    snakeNextDir: 'RIGHT',
    snakeFood: { x: 22, y: 5 },

    // Pong
    pongPaddleY: 3,
    pongPaddleH: 3,
    pongBall: { x: 15, y: 5, vx: 1, vy: 1 },

    // Galaxy Defender
    defPlayerY: 4,
    defBullets: [],
    defEnemies: [],
    defTickCounter: 0,

    // Brick Breaker
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
  // Rate-limited to max 2.5 FPS (every 400ms) to match ESP32 polling rate.
  // The local game loop NEVER waits for or gets blocked by network I/O.
  // =========================================================================
  const pushFrameToHardware = useCallback((pixels) => {
    if (!syncToMatrix) return;
    pendingFrameRef.current = pixels;

    const now = Date.now();
    // Enforce minimum 380ms spacing between network calls and respect backoff
    if (now < networkBackoffUntilRef.current) return;
    if (now - lastTransmitTimeRef.current < 380) return;
    if (isTransmittingRef.current) return;

    lastTransmitTimeRef.current = now;
    isTransmittingRef.current = true;

    // Send asynchronously in background without awaiting in the game loop
    const frameData = pendingFrameRef.current;
    sendCommand('image', { pixels: frameData }, { timeoutMs: 1800 })
      .then(() => {
        setMatrixStatus('Synced 🟢');
      })
      .catch((err) => {
        // If network times out or drops, back off for 2.5 seconds to protect phone CPU/network
        networkBackoffUntilRef.current = Date.now() + 2500;
        setMatrixStatus('Offline / Paused ⚪');
      })
      .finally(() => {
        isTransmittingRef.current = false;
      });
  }, [syncToMatrix]);

  // =========================================================================
  // Game Initializers & Logic
  // =========================================================================
  const getSpeedMs = () => {
    if (activeGame === 'snake') {
      if (speedLevel === 'slow') return 160;
      if (speedLevel === 'fast') return 85;
      return 120;
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
    return 100;
  };

  const spawnFood = (snake) => {
    let newFood;
    let attempts = 0;
    while (attempts < 200) {
      newFood = {
        x: Math.floor(Math.random() * MATRIX_WIDTH),
        y: Math.floor(Math.random() * MATRIX_HEIGHT)
      };
      const onSnake = snake.some((s) => s.x === newFood.x && s.y === newFood.y);
      if (!onSnake) return newFood;
      attempts++;
    }
    return { x: 0, y: 0 };
  };

  const initGame = useCallback((gameId = activeGame) => {
    const s = stateRef.current;
    setScore(0);

    if (gameId === 'snake') {
      s.snake = [{ x: 12, y: 5 }, { x: 11, y: 5 }, { x: 10, y: 5 }];
      s.snakeDir = 'RIGHT';
      s.snakeNextDir = 'RIGHT';
      s.snakeFood = spawnFood(s.snake);
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
  // Game Renderers (Convert State -> 30x10 RGB Grid)
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
      // Food (glowing magenta)
      setPixel(s.snakeFood.x, s.snakeFood.y, [255, 0, 127]);

      // Body (Neon Green)
      for (let i = 1; i < s.snake.length; i++) {
        setPixel(s.snake[i].x, s.snake[i].y, [0, 255, 120]);
      }
      // Head (Cyan / White)
      if (s.snake.length > 0) {
        setPixel(s.snake[0].x, s.snake[0].y, [0, 240, 255]);
      }
    } else if (gameId === 'pong') {
      // Paddle on column 0 (3 pixels tall)
      for (let i = 0; i < s.pongPaddleH; i++) {
        setPixel(0, s.pongPaddleY + i, [0, 240, 255]);
      }
      // Ball (Neon Yellow)
      setPixel(Math.round(s.pongBall.x), Math.round(s.pongBall.y), [255, 240, 0]);

      // Right wall markers
      for (let y = 0; y < MATRIX_HEIGHT; y += 2) {
        setPixel(MATRIX_WIDTH - 1, y, [15, 25, 45]);
      }
    } else if (gameId === 'defender') {
      // Player Ship
      setPixel(0, s.defPlayerY, [255, 120, 0]);
      setPixel(1, s.defPlayerY, [0, 240, 255]);
      setPixel(2, s.defPlayerY, [255, 255, 255]);

      // Bullets
      s.defBullets.forEach((b) => {
        setPixel(b.x, b.y, [255, 0, 150]);
      });

      // Enemies
      s.defEnemies.forEach((e) => {
        setPixel(e.x, e.y, e.color || [255, 50, 70]);
      });
    } else if (gameId === 'breaker') {
      // Bricks
      s.breakBricks.forEach((b) => {
        if (b.active) setPixel(b.x, b.y, b.color);
      });

      // Paddle on row 9
      for (let i = 0; i < s.breakPaddleW; i++) {
        setPixel(s.breakPaddleX + i, MATRIX_HEIGHT - 1, [0, 240, 255]);
      }

      // Ball
      setPixel(Math.round(s.breakBall.x), Math.round(s.breakBall.y), [255, 240, 0]);
    }

    // Immediately push to Live Canvas Simulator (0ms delay)
    if (onFrameUpdate) onFrameUpdate(grid);

    // Throttle transmission to hardware in background
    pushFrameToHardware(grid);
  }, [activeGame, onFrameUpdate, pushFrameToHardware]);

  // =========================================================================
  // Game Loop Ticks
  // =========================================================================
  const tickSnake = () => {
    const s = stateRef.current;
    s.snakeDir = s.snakeNextDir;

    const head = { ...s.snake[0] };
    if (s.snakeDir === 'UP') head.y--;
    else if (s.snakeDir === 'DOWN') head.y++;
    else if (s.snakeDir === 'LEFT') head.x--;
    else if (s.snakeDir === 'RIGHT') head.x++;

    // Wall Collision
    if (head.x < 0 || head.x >= MATRIX_WIDTH || head.y < 0 || head.y >= MATRIX_HEIGHT) {
      handleGameOver();
      return;
    }

    // Self Collision
    if (s.snake.some((seg) => seg.x === head.x && seg.y === head.y)) {
      handleGameOver();
      return;
    }

    const newSnake = [head, ...s.snake];

    // Eat Food?
    if (head.x === s.snakeFood.x && head.y === s.snakeFood.y) {
      sfx.score();
      triggerHaptic(30);
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

    // Top / Bottom wall bounce
    if (y <= 0) {
      y = 0;
      vy = -vy;
    } else if (y >= MATRIX_HEIGHT - 1) {
      y = MATRIX_HEIGHT - 1;
      vy = -vy;
    }

    // Right wall bounce
    if (x >= MATRIX_WIDTH - 1) {
      x = MATRIX_WIDTH - 1;
      vx = -vx;
    }

    // Paddle Hit on Column 0
    if (x <= 1) {
      if (y >= s.pongPaddleY && y < s.pongPaddleY + s.pongPaddleH) {
        x = 1;
        vx = Math.abs(vx); // Bounce right
        sfx.score();
        triggerHaptic(25);
        setScore((sc) => {
          const next = sc + 5;
          updateHighScore(next);
          return next;
        });
      } else if (x < 0) {
        // Missed paddle!
        sfx.hit();
        triggerHaptic(60);
        setLives((lv) => {
          const rem = lv - 1;
          if (rem <= 0) {
            handleGameOver();
          } else {
            s.pongBall = { x: 15, y: 5, vx: 1, vy: Math.random() > 0.5 ? 1 : -1 };
          }
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

    // Move Bullets (+2)
    const newBullets = [];
    s.defBullets.forEach((b) => {
      const nextX = b.x + 2;
      if (nextX < MATRIX_WIDTH) {
        newBullets.push({ x: nextX, y: b.y });
      }
    });

    // Spawn Enemies
    if (s.defTickCounter % 6 === 0) {
      const spawnY = Math.floor(Math.random() * MATRIX_HEIGHT);
      s.defEnemies.push({
        x: MATRIX_WIDTH - 1,
        y: spawnY,
        color: Math.random() > 0.5 ? [255, 60, 60] : [255, 170, 0]
      });
    }

    // Move Enemies left (-1)
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

    // Bullet vs Enemy Collision
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

    // Walls
    if (x <= 0) { x = 0; vx = -vx; }
    else if (x >= MATRIX_WIDTH - 1) { x = MATRIX_WIDTH - 1; vx = -vx; }

    // Ceiling
    if (y <= 0) { y = 0; vy = -vy; }

    // Brick Collision
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

    // Paddle Bounce (Row 9)
    if (y >= MATRIX_HEIGHT - 1) {
      if (x >= s.breakPaddleX && x < s.breakPaddleX + s.breakPaddleW) {
        y = MATRIX_HEIGHT - 2;
        vy = -Math.abs(vy);
        triggerHaptic(20);
      } else {
        // Missed Paddle
        sfx.hit();
        triggerHaptic(60);
        setLives((lv) => {
          const rem = lv - 1;
          if (rem <= 0) {
            handleGameOver();
          } else {
            s.breakBall = { x: s.breakPaddleX + 2, y: 7, vx: 1, vy: -1 };
          }
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
  }, [activeGame]);

  const handleGameOver = () => {
    setGameState('gameover');
    sfx.gameOver();
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    if (onToast) {
      onToast({ type: 'warning', message: `Game Over! Final Score: ${score}` });
    }
  };

  // Start / Pause / Reset Controls
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
  }, [gameState, activeGame, speedLevel, gameStep]);

  // Handle Game Switch
  const switchGame = (gameId) => {
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    setActiveGame(gameId);
    setGameState('ready');
    initGame(gameId);
  };

  // =========================================================================
  // Phone Joystick & Input Handlers
  // =========================================================================
  const handleSnakeInput = (dir) => {
    const s = stateRef.current;
    triggerHaptic(15);
    if (dir === 'UP' && s.snakeDir !== 'DOWN') s.snakeNextDir = 'UP';
    else if (dir === 'DOWN' && s.snakeDir !== 'UP') s.snakeNextDir = 'DOWN';
    else if (dir === 'LEFT' && s.snakeDir !== 'RIGHT') s.snakeNextDir = 'LEFT';
    else if (dir === 'RIGHT' && s.snakeDir !== 'LEFT') s.snakeNextDir = 'RIGHT';
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

  // Touch button action helper with instant response
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

      {/* Game Telemetry & Status Bar */}
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
            Stream to Hardware Matrix (WS2812B)
          </span>
        </label>

        <div className="hardware-stream-badge">
          {syncToMatrix ? (
            <span className="stream-online">
              <span className="status-pulse-dot online" />
              Matrix Stream: {matrixStatus}
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

        {/* 1. SNAKE GAMEPAD: 4-WAY CROSS D-PAD */}
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
                <div className="dpad-center-hub" />
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

        {/* 2. PONG GAMEPAD: VERTICAL PADDLE DUAL BUTTONS */}
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

        {/* 3. GALAXY DEFENDER GAMEPAD: DUAL-HAND COMBAT CONTROLLER */}
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

        {/* 4. BRICK BREAKER GAMEPAD: HORIZONTAL STEERING PAD */}
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
        <span className="footer-label">Engine Speed:</span>
        <div className="speed-pills">
          <button
            type="button"
            className={`speed-pill ${speedLevel === 'slow' ? 'active' : ''}`}
            onClick={() => setSpeedLevel('slow')}
          >
            Relaxed
          </button>
          <button
            type="button"
            className={`speed-pill ${speedLevel === 'normal' ? 'active' : ''}`}
            onClick={() => setSpeedLevel('normal')}
          >
            Normal (Default)
          </button>
          <button
            type="button"
            className={`speed-pill ${speedLevel === 'fast' ? 'active' : ''}`}
            onClick={() => setSpeedLevel('fast')}
          >
            Cyber Turbo 🔥
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(GameControl);
