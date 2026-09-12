import { CONSTANTS } from '../constants';
import { seconds, type Seconds } from '../units';
import type { WaterBody } from '../water/body';
import { breachApproach } from '../water/surface';
import type { BreachState } from '../flight/state';

export function endBreach(state: BreachState): void {
  if (state.active) state.cooldown = CONSTANTS.BREACH.COOLDOWN;
  state.active = false;
  state.dilation = 1;
}

export function updateBreach(state: BreachState, body: WaterBody | undefined, dt: Seconds): void {
  const realStep = dt / state.dilation;
  state.cooldown = seconds(Math.max(0, state.cooldown - realStep));
  const approach = body ? breachApproach(body.position.y, body.velocity.y) : undefined;
  if (state.active) {
    state.elapsedReal = seconds(state.elapsedReal + realStep);
    if (approach === undefined || state.elapsedReal >= CONSTANTS.BREACH.MAX_REAL_TIME) endBreach(state);
  } else if (state.cooldown === 0 && approach !== undefined) {
    state.active = true;
    state.elapsedReal = seconds(0);
    state.dilation = Math.max(CONSTANTS.BREACH.MIN_DILATION, Math.min(1, approach / CONSTANTS.BREACH.TARGET_REAL_TIME));
  }
}
