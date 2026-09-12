export const PALETTE = Object.freeze({
  VOID: 0x04050c,
  PLAYER: 0x2bf5ff,
  PLAYER_HOT: 0xb8feff,
  ABYSS: 0x080b1f,
  SURFACE: 0x5fffe0,
  TELEGRAPH: 0xffb020,
  PANEL: 0x101418,
  PANEL_BORDER: 0x30363d,
  PANEL_DIVIDER: 0x242b31,
  INPUT: 0x080b0e,
  INPUT_BORDER: 0x46515b,
  MUTED: 0xa7b2ba,
  ACTION_BORDER: 0x62736d,
});

export function cssColour(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`;
}
