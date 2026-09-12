import type { StateFrame } from './headless';

export const CSV_HEADER = 'step,time_s,seed,rng_state,origin_x_m,origin_y_m,entities,turn,thrust,move_x,move_y,dash,commit';

export function stateCsv(frames: readonly StateFrame[]): string {
  if (frames.some((frame) => frame.scenario === 'flight')) {
    const header = 'step,time_s,phase,origin_x_m,origin_y_m,local_x_m,local_y_m,vx_mps,vy_mps,heading_rad,tier,dash_charges,entry_grade,dilation';
    const rows = frames.map((frame) => {
      const air = frame.flight;
      const origin = air?.arena.origin ?? frame.player?.position;
      const movement = air?.velocity ?? frame.player?.velocity;
      return [frame.stepIndex, frame.time, air ? 'air' : frame.returning ? 'return' : 'water',
        origin?.x, origin?.y, air?.arena.player.position.x ?? '', air?.arena.player.position.y ?? '',
        movement?.x, movement?.y, air?.arena.player.heading ?? frame.player?.heading,
        air?.arena.tier ?? '', air?.arena.player.dashCharges ?? '', frame.player?.lastCrossing?.grade ?? '', frame.breach?.dilation,
      ].join(',');
    });
    return `${[header, ...rows].join('\n')}\n`;
  }
  const water = frames.some((frame) => frame.player !== undefined);
  const header = water ? `${CSV_HEADER},x_m,y_m,vx_mps,vy_mps,heading_rad,medium,lockout_s,streak,breaches,entries,skips,best_apex_m,camera_x_m,camera_y_m,crossing,impact_time_s,impact_speed_mps,entry_grade,entry_error_rad` : CSV_HEADER;
  const rows = frames.map((frame) => {
    const base = [
    frame.stepIndex, frame.time, frame.seed, frame.rngState,
    frame.originX, frame.originY, frame.entityCount,
    frame.intent.turn, Number(frame.intent.thrust), frame.intent.move.x, frame.intent.move.y,
    Number(frame.intent.dash), Number(frame.intent.commit),
    ];
    if (!water) return base.join(',');
    const body = frame.player;
    if (!body || !frame.camera) throw new Error('A water recording must contain a player and camera in every frame.');
    return [...base,
      body.position.x, body.position.y, body.velocity.x, body.velocity.y, body.heading,
      body.medium, body.lockout, body.streak, body.breaches, body.entries, body.skips, body.bestApex,
      frame.camera.x, frame.camera.y, body.lastCrossing?.kind ?? '', body.lastCrossing?.time ?? '',
      body.lastCrossing?.incomingSpeed ?? '', body.lastCrossing?.grade ?? '', body.lastCrossing?.error ?? '',
    ].join(',');
  });
  return `${[header, ...rows].join('\n')}\n`;
}
