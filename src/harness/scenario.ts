import { createFlightWorld, createWaterWorld, createWorld } from '../sim/world';

export function scenarioFactory(scenario: 'empty' | 'water' | 'flight') {
  return scenario === 'flight' ? createFlightWorld : scenario === 'water' ? createWaterWorld : createWorld;
}
