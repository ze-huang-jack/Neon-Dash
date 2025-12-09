export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export enum EntityType {
  PLAYER = 'PLAYER',
  BLOCK = 'BLOCK',
  SPIKE = 'SPIKE',
  FLOOR = 'FLOOR'
}

export interface Entity extends Rect {
  type: EntityType;
  id: number;
  color?: string;
  rotation?: number; // For spikes or decorations
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}