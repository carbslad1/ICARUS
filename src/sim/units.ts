export interface Vec2<T = number> {
  readonly x: T;
  readonly y: T;
}

export type Metres = number & { readonly __unit: 'm' };
export type MetresPerSec = number & { readonly __unit: 'm/s' };
export type MetresPerSec2 = number & { readonly __unit: 'm/s2' };
export type Seconds = number & { readonly __unit: 's' };
export type Radians = number & { readonly __unit: 'rad' };
export type RadiansPerSec = number & { readonly __unit: 'rad/s' };
export type PerSecond = number & { readonly __unit: '1/s' };
export type PerMetre = number & { readonly __unit: '1/m' };
export type PerRadian = number & { readonly __unit: '1/rad' };
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
export const radiansPerSec = (value: number): RadiansPerSec => finite(value) as RadiansPerSec;
export const perSecond = (value: number): PerSecond => finite(value) as PerSecond;
export const perMetre = (value: number): PerMetre => finite(value) as PerMetre;
export const perRadian = (value: number): PerRadian => finite(value) as PerRadian;

export function velocity(x: number, y: number): Vec2<MetresPerSec> {
  return Object.freeze({ x: metresPerSec(x), y: metresPerSec(y) });
}

export function acceleration(x: number, y: number): Vec2<MetresPerSec2> {
  return Object.freeze({ x: metresPerSec2(x), y: metresPerSec2(y) });
}

export function angleDifference(target: Radians, current: Radians): Radians {
  let difference = (target - current) % (2 * Math.PI);
  if (difference > Math.PI) difference -= 2 * Math.PI;
  if (difference < -Math.PI) difference += 2 * Math.PI;
  return radians(difference);
}

export function worldPos(x: number, y: number): WorldPos {
  return Object.freeze({ x: metres(x), y: metres(y) }) as WorldPos;
}

export function localPos(x: number, y: number): LocalPos {
  return Object.freeze({ x: metres(x), y: metres(y) }) as LocalPos;
}

export function toWorld(local: LocalPos, arena: { readonly origin: WorldPos }): WorldPos {
  return worldPos(arena.origin.x + local.x, arena.origin.y + local.y);
}
