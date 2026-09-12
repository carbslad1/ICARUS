import { CONSTANTS } from '../sim/constants';
import type { WorldPos } from '../sim/units';

export function createProjection(width: number, height: number, camera: WorldPos) {
  const PIXELS_PER_METRE = height / CONSTANTS.CAMERA.VISIBLE_HEIGHT;
  return {
    scale: PIXELS_PER_METRE,
    toScreen(position: WorldPos) {
      return {
        x: width / 2 + (position.x - camera.x) * PIXELS_PER_METRE,
        y: height / 2 - (position.y - camera.y) * PIXELS_PER_METRE,
      };
    },
  };
}
