import { CONSTANTS } from '../sim/constants';
import type { WorldPos } from '../sim/units';

export function createProjection(width: number, height: number, camera: WorldPos, visibleHeight: number = CONSTANTS.CAMERA.VISIBLE_HEIGHT, top = 0) {
  const PIXELS_PER_METRE = height / visibleHeight;
  return {
    scale: PIXELS_PER_METRE,
    toScreen(position: WorldPos) {
      return {
        x: width / 2 + (position.x - camera.x) * PIXELS_PER_METRE,
        y: top + height / 2 - (position.y - camera.y) * PIXELS_PER_METRE,
      };
    },
  };
}
