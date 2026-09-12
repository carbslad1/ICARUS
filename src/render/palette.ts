export const PALETTE = Object.freeze({
  VOID: 0x04050c,
  PLAYER: 0x2bf5ff,
  PLAYER_HOT: 0xb8feff,
});

export function cssColour(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`;
}
