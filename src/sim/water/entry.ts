import { CONSTANTS } from '../constants';
import { atan2, magnitude } from '../math';
import { angleDifference, metresPerSec, radians } from '../units';
import type { MetresPerSec, Radians, Vec2 } from '../units';
import type { EntryGrade } from './body';
import { DEFAULT_TUNING, type MovementTuning } from '../tuning';

export function entryQuality(heading: Radians, incoming: Vec2<MetresPerSec>, streak: number, tuning: MovementTuning = DEFAULT_TUNING) {
  const error = radians(Math.abs(angleDifference(heading, radians(atan2(incoming.y, incoming.x)))));
  const spec = CONSTANTS.ENTRY;
  const epsilon = CONSTANTS.SURFACE.ANGLE_EPSILON;
  let grade: EntryGrade;
  let retention: number;
  if (error <= spec.PERFECT_ANGLE + epsilon) { grade = 'perfect'; retention = 1; }
  else if (error <= spec.CLEAN_ANGLE + epsilon) { grade = 'clean'; retention = tuning.cleanRetention; }
  else if (error <= spec.SLOPPY_ANGLE + epsilon) {
    grade = 'sloppy';
    const proportion = (error - spec.CLEAN_ANGLE) / (spec.SLOPPY_ANGLE - spec.CLEAN_ANGLE);
    retention = tuning.cleanRetention + (tuning.sloppyRetention - tuning.cleanRetention) * proportion;
  } else { grade = 'belly-flop'; retention = tuning.flopRetention; }
  const bonus = metresPerSec(grade === 'perfect'
    ? Math.min(tuning.perfectBonus + streak * tuning.streakBonus, tuning.bonusCap)
    : grade === 'clean' ? tuning.cleanBonus : 0);
  return {
    grade, retention, error, bonus,
    streak: grade === 'perfect' ? streak + 1 : 0,
    speed: metresPerSec(magnitude(incoming.x, incoming.y) * retention + bonus),
  };
}

export function shouldSkip(incoming: Vec2<MetresPerSec>): boolean {
  const downwardSpeed = -incoming.y;
  return downwardSpeed < CONSTANTS.ENTRY.SKIP_THRESHOLD &&
    downwardSpeed >= CONSTANTS.ENTRY.SKIP_SETTLE_SPEED &&
    magnitude(incoming.x, incoming.y) >= CONSTANTS.ENTRY.SKIP_MIN_SPEED;
}
