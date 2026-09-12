import { seconds } from './units';

export const CONSTANTS = Object.freeze({
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
});
