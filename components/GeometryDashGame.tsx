import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, EntityType, Entity, Particle, Rect } from '../types';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  GRAVITY, 
  JUMP_FORCE, 
  BASE_SPEED, 
  PLAYER_SIZE, 
  PLAYER_START_X,
  FLOOR_HEIGHT,
  COLORS,
  BLOCK_SIZE,
  PARTICLE_COUNT,
  TERMINAL_VELOCITY
} from '../constants';

export const GeometryDashGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Game State Refs (Mutable for performance in game loop)
  const gameStateRef = useRef<GameState>(GameState.MENU);
  const scoreRef = useRef<number>(0);
  const framesRef = useRef<number>(0);
  const bgHueRef = useRef<number>(0);
  
  // Physics State
  const playerRef = useRef({
    x: PLAYER_START_X,
    y: FLOOR_HEIGHT - PLAYER_SIZE,
    vy: 0,
    angle: 0,
    isGrounded: true,
    isDead: false
  });
  
  const cameraXRef = useRef<number>(0);
  const entitiesRef = useRef<Entity[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  // React State for UI Overlays (Menu/Game Over)
  const [uiState, setUiState] = useState<GameState>(GameState.MENU);
  const [displayScore, setDisplayScore] = useState(0);

  // --- Core Mechanics ---

  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      particlesRef.current.push({
        x: x + PLAYER_SIZE / 2,
        y: y + PLAYER_SIZE / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color: color,
        size: Math.random() * 4 + 2
      });
    }
  };

  const resetGame = () => {
    playerRef.current = {
      x: PLAYER_START_X,
      y: FLOOR_HEIGHT - PLAYER_SIZE,
      vy: 0,
      angle: 0,
      isGrounded: true,
      isDead: false
    };
    cameraXRef.current = 0;
    scoreRef.current = 0;
    framesRef.current = 0;
    entitiesRef.current = [];
    particlesRef.current = [];
    
    // Initial Platform
    generateObstacles(500); 
    
    gameStateRef.current = GameState.PLAYING;
    setUiState(GameState.PLAYING);
  };

  const jump = useCallback(() => {
    if (gameStateRef.current === GameState.MENU || gameStateRef.current === GameState.GAME_OVER) {
      resetGame();
      return;
    }

    if (playerRef.current.isGrounded && !playerRef.current.isDead) {
      playerRef.current.vy = JUMP_FORCE;
      playerRef.current.isGrounded = false;
    }
  }, []);

  // --- Procedural Generation ---

  const generateObstacles = (startFromX: number) => {
    // Determine generation point relative to camera
    const visibleRightEdge = cameraXRef.current + CANVAS_WIDTH + 100;
    
    // If the last entity is too far left, or we have no entities, add more
    const lastEntity = entitiesRef.current[entitiesRef.current.length - 1];
    let nextX = lastEntity ? lastEntity.x + lastEntity.w + 200 : startFromX;

    if (nextX < visibleRightEdge) {
      // Logic to spawn varied patterns
      // Ensure we don't spawn infinite blocks. We buffer about 2 screens worth.
      while (nextX < visibleRightEdge + CANVAS_WIDTH) {
        const gap = Math.random() * 300 + 250; // Distance between obstacles
        nextX += gap;

        const pattern = Math.random();
        
        if (pattern < 0.4) {
          // Single Spike
          entitiesRef.current.push({
            type: EntityType.SPIKE,
            x: nextX,
            y: FLOOR_HEIGHT - BLOCK_SIZE,
            w: BLOCK_SIZE,
            h: BLOCK_SIZE,
            id: Math.random(),
            color: COLORS.SPIKE
          });
        } else if (pattern < 0.6) {
          // Double Spike
          entitiesRef.current.push({
            type: EntityType.SPIKE,
            x: nextX,
            y: FLOOR_HEIGHT - BLOCK_SIZE,
            w: BLOCK_SIZE,
            h: BLOCK_SIZE,
            id: Math.random(),
            color: COLORS.SPIKE
          });
          entitiesRef.current.push({
            type: EntityType.SPIKE,
            x: nextX + 30, // Tight spacing
            y: FLOOR_HEIGHT - BLOCK_SIZE,
            w: BLOCK_SIZE,
            h: BLOCK_SIZE,
            id: Math.random(),
            color: COLORS.SPIKE
          });
        } else if (pattern < 0.8) {
          // Block
          entitiesRef.current.push({
            type: EntityType.BLOCK,
            x: nextX,
            y: FLOOR_HEIGHT - BLOCK_SIZE,
            w: BLOCK_SIZE,
            h: BLOCK_SIZE,
            id: Math.random(),
            color: COLORS.OBSTACLE
          });
        } else {
           // Block with Spike on top
           entitiesRef.current.push({
            type: EntityType.BLOCK,
            x: nextX,
            y: FLOOR_HEIGHT - BLOCK_SIZE,
            w: BLOCK_SIZE,
            h: BLOCK_SIZE,
            id: Math.random(),
            color: COLORS.OBSTACLE
          });
          entitiesRef.current.push({
            type: EntityType.SPIKE,
            x: nextX + 10,
            y: FLOOR_HEIGHT - (BLOCK_SIZE * 2), // On top of block
            w: 30,
            h: 30,
            id: Math.random(),
            color: COLORS.SPIKE
          });
        }
      }
    }
  };

  // --- Collision Detection ---

  const checkCollision = (player: Rect & {vy: number}, entity: Entity): 'NONE' | 'DEATH' | 'LAND' | 'WALL' => {
    // Simple AABB first
    const hitX = player.x < entity.x + entity.w && player.x + player.w > entity.x;
    const hitY = player.y < entity.y + entity.h && player.y + player.h > entity.y;

    if (!hitX || !hitY) return 'NONE';

    // Detailed resolution based on type
    if (entity.type === EntityType.SPIKE) {
      // Reduce spike hitbox slightly to be forgiving
      const pad = 10;
      const spikeHitX = player.x + pad < entity.x + entity.w - pad && player.x + player.w - pad > entity.x + pad;
      const spikeHitY = player.y + pad < entity.y + entity.h - pad && player.y + player.h - pad > entity.y + pad;
      return (spikeHitX && spikeHitY) ? 'DEATH' : 'NONE';
    }

    if (entity.type === EntityType.BLOCK) {
      // Check if landing on top
      // Player bottom was previously above block top
      // We use a small threshold. If player is falling and their feet are near the top.
      const feetDepth = (player.y + player.h) - entity.y;
      const isFalling = player.vy >= 0;
      
      if (isFalling && feetDepth <= 20 && player.y + player.h > entity.y) {
        return 'LAND';
      }
      
      // Otherwise it's a frontal collision
      return 'DEATH';
    }

    return 'NONE';
  };

  // --- Game Loop ---

  const update = () => {
    if (gameStateRef.current !== GameState.PLAYING) return;

    const player = playerRef.current;
    framesRef.current++;
    bgHueRef.current = (bgHueRef.current + 0.1) % 360;

    // 1. Move Camera/World
    const speed = BASE_SPEED;
    cameraXRef.current += speed;
    scoreRef.current = Math.floor(cameraXRef.current / 100);

    // 2. Physics - Gravity
    player.vy += GRAVITY;
    if (player.vy > TERMINAL_VELOCITY) player.vy = TERMINAL_VELOCITY;
    player.y += player.vy;

    // 3. Ground Collision (Floor)
    let landed = false;
    if (player.y + PLAYER_SIZE >= FLOOR_HEIGHT) {
      player.y = FLOOR_HEIGHT - PLAYER_SIZE;
      player.vy = 0;
      landed = true;
    }

    // 4. Entity Management & Collision
    // Remove entities off screen
    entitiesRef.current = entitiesRef.current.filter(e => e.x + e.w > cameraXRef.current - 100);
    // Add new ones
    generateObstacles(cameraXRef.current + CANVAS_WIDTH);

    // Check collisions
    for (const entity of entitiesRef.current) {
      // Optimization: Only check entities near player
      if (entity.x > cameraXRef.current + player.x + 200) continue;
      if (entity.x + entity.w < cameraXRef.current + player.x - 100) continue;

      // Adjust entity position relative to camera for logic (Player is static X, world moves)
      // Actually, my logic uses absolute world coordinates for entities, and relative for player render.
      // But Physics logic needs consistent coordinates. 
      // Let's use World Coordinates for collision:
      // Player World X = cameraX + PLAYER_START_X
      
      const playerWorldRect = {
        x: cameraXRef.current + PLAYER_START_X,
        y: player.y,
        w: PLAYER_SIZE,
        h: PLAYER_SIZE,
        vy: player.vy
      };

      const result = checkCollision(playerWorldRect, entity);

      if (result === 'DEATH') {
        player.isDead = true;
        spawnParticles(PLAYER_START_X, player.y, COLORS.NEON_PINK);
        gameStateRef.current = GameState.GAME_OVER;
        setUiState(GameState.GAME_OVER);
        setDisplayScore(scoreRef.current);
      } else if (result === 'LAND') {
        player.y = entity.y - PLAYER_SIZE;
        player.vy = 0;
        landed = true;
      }
    }

    player.isGrounded = landed;

    // 5. Rotation Logic
    if (player.isGrounded) {
      // Snap to nearest 90
      const targetAngle = Math.round(player.angle / (Math.PI / 2)) * (Math.PI / 2);
      player.angle += (targetAngle - player.angle) * 0.2; // Interpolate
    } else {
      player.angle += 0.15; // Rotate while jumping
    }

    // 6. Particles
    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2; // particle gravity
      p.life -= 0.02;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear
    ctx.fillStyle = `hsl(${bgHueRef.current}, 40%, 10%)`; // Dynamic background
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Floor
    // Create a scrolling grid effect on the floor
    ctx.fillStyle = '#000';
    ctx.fillRect(0, FLOOR_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT - FLOOR_HEIGHT);
    
    ctx.strokeStyle = `hsl(${bgHueRef.current}, 70%, 50%)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, FLOOR_HEIGHT);
    ctx.lineTo(CANVAS_WIDTH, FLOOR_HEIGHT);
    ctx.stroke();

    // Floor grid lines
    const gridOffset = -(cameraXRef.current % BLOCK_SIZE);
    ctx.beginPath();
    ctx.strokeStyle = `hsla(${bgHueRef.current}, 70%, 50%, 0.3)`;
    for (let i = gridOffset; i < CANVAS_WIDTH; i += BLOCK_SIZE) {
        ctx.moveTo(i, FLOOR_HEIGHT);
        ctx.lineTo(i - 40, CANVAS_HEIGHT); // Slanted lines for speed effect
    }
    ctx.stroke();


    // Draw Entities
    entitiesRef.current.forEach(entity => {
      // Transform world X to screen X
      const screenX = entity.x - cameraXRef.current;
      
      // Skip if offscreen
      if (screenX < -100 || screenX > CANVAS_WIDTH) return;

      if (entity.type === EntityType.BLOCK) {
        // Neon Block
        ctx.strokeStyle = COLORS.NEON_CYAN;
        ctx.lineWidth = 3;
        ctx.strokeRect(screenX, entity.y, entity.w, entity.h);
        
        // Inner glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = COLORS.NEON_CYAN;
        ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
        ctx.fillRect(screenX, entity.y, entity.w, entity.h);
        ctx.shadowBlur = 0;

        // Inner detail
        ctx.fillStyle = COLORS.NEON_CYAN;
        ctx.fillRect(screenX + 10, entity.y + 10, entity.w - 20, entity.h - 20);

      } else if (entity.type === EntityType.SPIKE) {
        // Neon Spike (Triangle)
        ctx.beginPath();
        ctx.moveTo(screenX, entity.y + entity.h); // Bottom Left
        ctx.lineTo(screenX + entity.w / 2, entity.y); // Top Middle
        ctx.lineTo(screenX + entity.w, entity.y + entity.h); // Bottom Right
        ctx.closePath();

        ctx.strokeStyle = COLORS.SPIKE;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.shadowBlur = 15;
        ctx.shadowColor = COLORS.SPIKE;
        ctx.fillStyle = 'black';
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Small inner triangle
        ctx.beginPath();
        ctx.moveTo(screenX + 10, entity.y + entity.h - 5);
        ctx.lineTo(screenX + entity.w / 2, entity.y + 15);
        ctx.lineTo(screenX + entity.w - 10, entity.y + entity.h - 5);
        ctx.fillStyle = COLORS.SPIKE;
        ctx.fill();
      }
    });

    // Draw Player
    if (!playerRef.current.isDead) {
      const p = playerRef.current;
      ctx.save();
      // Translate to center of player for rotation
      ctx.translate(PLAYER_START_X + PLAYER_SIZE / 2, p.y + PLAYER_SIZE / 2);
      ctx.rotate(p.angle);
      
      // Player Cube
      ctx.shadowBlur = 20;
      ctx.shadowColor = COLORS.NEON_YELLOW;
      
      // Outer border
      ctx.strokeStyle = COLORS.NEON_YELLOW;
      ctx.lineWidth = 3;
      ctx.strokeRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
      
      // Inner fill
      ctx.fillStyle = `rgba(255, 255, 0, 0.2)`;
      ctx.fillRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
      
      // Face detail (classic GD face)
      ctx.fillStyle = COLORS.NEON_YELLOW;
      const size = PLAYER_SIZE;
      // Eye
      ctx.fillRect(-size/4, -size/4, size/6, size/6); 
      // Eye
      ctx.fillRect(size/12, -size/4, size/6, size/6);
      // Mouth
      ctx.fillRect(-size/4, size/8, size/2, size/10);
      
      ctx.restore();
    }

    // Draw Particles
    particlesRef.current.forEach(p => {
      const screenX = p.x; // Particles are spawned relative to screen X usually (if we spawn at PLAYER_START_X)
      // Actually particles should move with world or stay relative to screen?
      // Simple approach: Particles are "world" objects but spawned at player fixed screen position.
      // To make them look right, we spawn them at Screen X, but if the world moves fast, they should "drag" behind?
      // For this arcade style, screen space particles are fine.
      
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    // Draw Score (HUD)
    if (gameStateRef.current === GameState.PLAYING) {
      ctx.font = '900 30px "Orbitron", sans-serif';
      ctx.fillStyle = 'white';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'white';
      ctx.fillText(`SCORE: ${scoreRef.current}`, 20, 50);
      ctx.shadowBlur = 0;
    }
  };

  const loop = (time: number) => {
    update();
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        draw(ctx);
      }
    }
    
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      jump();
    };

    window.addEventListener('keydown', handleKeyDown);
    // Bind click to canvas wrapper for better UX
    const canvasEl = canvasRef.current;
    if(canvasEl) {
      canvasEl.addEventListener('mousedown', handleMouseDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if(canvasEl) {
        canvasEl.removeEventListener('mousedown', handleMouseDown);
      }
    };
  }, [jump]);


  return (
    <div className="relative group cursor-pointer">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="rounded-lg shadow-2xl bg-black block select-none"
        style={{ maxWidth: '100%', height: 'auto' }}
        onClick={jump}
      />
      
      {/* UI Overlay */}
      {uiState !== GameState.PLAYING && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg z-20 transition-opacity">
          {uiState === GameState.MENU && (
            <div className="text-center animate-pulse">
              <h2 className="text-4xl font-bold text-white mb-4 shadow-neon">READY?</h2>
              <button 
                onClick={(e) => { e.stopPropagation(); jump(); }}
                className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xl skew-x-[-10deg] transition-transform hover:scale-110 shadow-[0_0_20px_rgba(0,240,255,0.6)]"
              >
                START GAME
              </button>
            </div>
          )}

          {uiState === GameState.GAME_OVER && (
            <div className="text-center">
              <h2 className="text-5xl font-black text-red-500 mb-2 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">CRASHED</h2>
              <p className="text-xl text-white mb-6 font-mono">SCORE: {displayScore}</p>
              <button 
                onClick={(e) => { e.stopPropagation(); jump(); }}
                className="px-8 py-3 bg-white hover:bg-gray-200 text-black font-black text-xl skew-x-[-10deg] transition-transform hover:scale-110 shadow-[0_0_20px_rgba(255,255,255,0.6)]"
              >
                RETRY
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};