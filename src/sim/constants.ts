import { metres, metresPerSec, metresPerSec2, perMetre, perRadian, perSecond, radians, radiansPerSec, seconds } from './units';

export const CONSTANTS = Object.freeze({
  NUMERICS: Object.freeze({
    SERIES_TERMS: 24,
  }),
  TIME: Object.freeze({
    SIM_DT: seconds(1 / 120),
    MAX_FRAME_TIME: seconds(0.25),
  }),
  RNG: Object.freeze({
    DEFAULT_SEED: 1,
    MULTIPLIER: 1664525,
    INCREMENT: 1013904223,
    MODULUS: 4294967296,
  }),
  WATER: Object.freeze({
    WATER_GRAVITY: metresPerSec2(-3.5),
    WATER_DRAG_QUADRATIC: perMetre(0.012),
    WATER_THRUST: metresPerSec2(22),
    WATER_TURN_RATE: radiansPerSec(2.8),
    WATER_REDIRECT_RATE: perSecond(0.55),
    WATER_MAX_THRUST_SPEED: metresPerSec(26),
    TURN_COST: perRadian(0.35),
    AIR_GRAVITY: metresPerSec2(-18),
  }),
  ENTRY: Object.freeze({
    PERFECT_ANGLE: radians(0.09),
    CLEAN_ANGLE: radians(0.26),
    SLOPPY_ANGLE: radians(0.7),
    CLEAN_RETENTION: 0.97,
    SLOPPY_RETENTION: 0.72,
    FLOP_RETENTION: 0.45,
    PERFECT_BONUS: metresPerSec(1.5),
    PERFECT_STREAK_BONUS: metresPerSec(0.25),
    PERFECT_BONUS_CAP: metresPerSec(4),
    FLOP_LOCKOUT: seconds(0.25),
    SKIP_THRESHOLD: metresPerSec(4),
    SKIP_MIN_SPEED: metresPerSec(8),
    SKIP_SETTLE_SPEED: metresPerSec(0.25),
    SKIP_RESTITUTION: 0.6,
  }),
  SURFACE: Object.freeze({
    SURFACE_Y: metres(0),
    HYSTERESIS: metres(0.15),
    ROOT_EPSILON: seconds(1e-12),
    ANGLE_EPSILON: radians(1e-12),
    MAX_CROSSINGS_PER_STEP: 8,
  }),
  PLAYER: Object.freeze({
    START_DEPTH: metres(-8),
    START_SPEED_X: metresPerSec(12),
    START_SPEED_Y: metresPerSec(-6),
    DOLPHIN_LENGTH: metres(2.5),
  }),
  CAMERA: Object.freeze({
    RESPONSE: perSecond(5),
    LOOK_AHEAD: seconds(0.3),
    VISIBLE_HEIGHT: metres(50),
  }),
});
