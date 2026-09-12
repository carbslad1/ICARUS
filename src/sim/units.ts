export interface Vec2<T = number> {
  readonly x: T;
  readonly y: T;
}

export type Metres = number & { readonly __unit: 'm' };
export type MetresPerSec = number & { readonly __unit: 'm/s' };
export type MetresPerSec2 = number & { readonly __unit: 'm/s2' };
export type Seconds = number & { readonly __unit: 's' };
export type Radians = number & { readonly __unit: 'rad' };
export type WorldPos = Vec2<Metres> & { readonly __space: 'world' };
export type LocalPos = Vec2<Metres> & { readonly __space: 'arena' };

function finite(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError('Units must be finite.');
  return value;
}

export const metres = (value: number): Metres => finite(value) as Metres;
export const metresPerSec = (value: number): MetresPerSec => finite(value) as MetresPerSec;
export const metresPerSec2 = (value: number): MetresPerSec2 => finite(value) as MetresPerSec2;
export const seconds = (value: number): Seconds => finite(value) as Seconds;
export const radians = (value: number): Radians => finite(value) as Radians;

export function worldPos(x: number, y: number): WorldPos {
  return Object.freeze({ x: metres(x), y: metres(y) }) as WorldPos;
}

export function localPos(x: number, y: number): LocalPos {
  return Object.freeze({ x: metres(x), y: metres(y) }) as LocalPos;
}

export function toWorld(local: LocalPos, arena: { readonly origin: WorldPos }): WorldPos {
  return worldPos(arena.origin.x + local.x, arena.origin.y + local.y);
}
