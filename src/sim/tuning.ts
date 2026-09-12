import { CONSTANTS } from './constants';
import { metresPerSec, metresPerSec2, perMetre, perRadian, perSecond, radians, radiansPerSec, seconds } from './units';

function setting<T extends number>(defaultValue: T, range: { MIN: number; MAX: number; STEP: number }, convert: (value: number) => T) {
  return Object.freeze({
    defaultValue, min: range.MIN, max: range.MAX, step: range.STEP,
    parse(value: unknown): T {
      if (value === undefined) return defaultValue;
      if (typeof value !== 'number' || !Number.isFinite(value) || value < range.MIN || value > range.MAX) {
        throw new RangeError('Movement setting outside its supported range.');
      }
      return convert(value);
    },
  });
}

const water = CONSTANTS.WATER;
const entry = CONSTANTS.ENTRY;
const ranges = CONSTANTS.TUNING_RANGES;
export const TUNING_FIELDS = Object.freeze({
  waterGravity: setting(water.WATER_GRAVITY, ranges.WATER_GRAVITY, metresPerSec2),
  waterDrag: setting(water.WATER_DRAG_QUADRATIC, ranges.WATER_DRAG_QUADRATIC, perMetre),
  thrust: setting(water.WATER_THRUST, ranges.WATER_THRUST, metresPerSec2),
  thrustSpeed: setting(water.WATER_MAX_THRUST_SPEED, ranges.WATER_MAX_THRUST_SPEED, metresPerSec),
  turnRate: setting(water.WATER_TURN_RATE, ranges.WATER_TURN_RATE, radiansPerSec),
  redirectRate: setting(water.WATER_REDIRECT_RATE, ranges.WATER_REDIRECT_RATE, perSecond),
  steerLead: setting(water.WATER_STEER_LEAD, ranges.WATER_STEER_LEAD, radians),
  turnCost: setting(water.TURN_COST, ranges.TURN_COST, perRadian),
  airGravity: setting(water.AIR_GRAVITY, ranges.AIR_GRAVITY, metresPerSec2),
  airTurnRate: setting(water.WATER_TURN_RATE, ranges.WATER_TURN_RATE, radiansPerSec),
  perfectBonus: setting(entry.PERFECT_BONUS, ranges.PERFECT_BONUS, metresPerSec),
  streakBonus: setting(entry.PERFECT_STREAK_BONUS, ranges.PERFECT_STREAK_BONUS, metresPerSec),
  bonusCap: setting(entry.PERFECT_BONUS_CAP, ranges.PERFECT_BONUS_CAP, metresPerSec),
  cleanBonus: setting(entry.CLEAN_BONUS, ranges.CLEAN_BONUS, metresPerSec),
  cleanRetention: setting<number>(entry.CLEAN_RETENTION, ranges.RETENTION, (value) => value),
  sloppyRetention: setting<number>(entry.SLOPPY_RETENTION, ranges.RETENTION, (value) => value),
  flopRetention: setting<number>(entry.FLOP_RETENTION, ranges.RETENTION, (value) => value),
  flopLockout: setting(entry.FLOP_LOCKOUT, ranges.FLOP_LOCKOUT, seconds),
});

export type MovementTuning = { readonly [K in keyof typeof TUNING_FIELDS]: ReturnType<typeof TUNING_FIELDS[K]['parse']> };
export type TuningKey = keyof MovementTuning;

export function parseMovementTuning(value: unknown): MovementTuning {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError('Expected movement settings.');
  const input: Record<string, unknown> = Object.fromEntries(Object.entries(value));
  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(TUNING_FIELDS, key)) throw new RangeError(`Unknown movement setting: ${key}`);
  }
  return Object.freeze({
    waterGravity: TUNING_FIELDS.waterGravity.parse(input.waterGravity),
    waterDrag: TUNING_FIELDS.waterDrag.parse(input.waterDrag),
    thrust: TUNING_FIELDS.thrust.parse(input.thrust),
    thrustSpeed: TUNING_FIELDS.thrustSpeed.parse(input.thrustSpeed),
    turnRate: TUNING_FIELDS.turnRate.parse(input.turnRate),
    redirectRate: TUNING_FIELDS.redirectRate.parse(input.redirectRate),
    steerLead: TUNING_FIELDS.steerLead.parse(input.steerLead),
    turnCost: TUNING_FIELDS.turnCost.parse(input.turnCost),
    airGravity: TUNING_FIELDS.airGravity.parse(input.airGravity),
    airTurnRate: TUNING_FIELDS.airTurnRate.parse(input.airTurnRate),
    perfectBonus: TUNING_FIELDS.perfectBonus.parse(input.perfectBonus),
    streakBonus: TUNING_FIELDS.streakBonus.parse(input.streakBonus),
    bonusCap: TUNING_FIELDS.bonusCap.parse(input.bonusCap),
    cleanBonus: TUNING_FIELDS.cleanBonus.parse(input.cleanBonus),
    cleanRetention: TUNING_FIELDS.cleanRetention.parse(input.cleanRetention),
    sloppyRetention: TUNING_FIELDS.sloppyRetention.parse(input.sloppyRetention),
    flopRetention: TUNING_FIELDS.flopRetention.parse(input.flopRetention),
    flopLockout: TUNING_FIELDS.flopLockout.parse(input.flopLockout),
  });
}

export const DEFAULT_TUNING = parseMovementTuning({});

export function isDefaultTuning(tuning: MovementTuning): boolean {
  return Object.entries(DEFAULT_TUNING).every(([key, value]) => Reflect.get(tuning, key) === value);
}
