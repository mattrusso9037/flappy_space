import { INK } from '../visuals/tokens';
import { EnvironmentDefinition, EnvironmentId } from './environmentTypes';

export const DEFAULT_ENVIRONMENT_ID: EnvironmentId = 'deep-nebula';

export const DEEP_NEBULA: EnvironmentDefinition = {
  id: 'deep-nebula',
  name: 'Deep Nebula',
  backgroundColor: INK.void,
  nebula: {
    primaryColor: '#183d59',
    secondaryColor: '#34204f',
    intermediateColor1: '#102238',
    intermediateColor2: '#211631',
    intensity: 0.65,
    driftSpeed: 1.0,
  },
  stars: {
    density: 1.0,
    speedMultiplier: 1.0,
    brightness: 1.0,
  },
};

export const VIOLET_REACH: EnvironmentDefinition = {
  id: 'violet-reach',
  name: 'Violet Reach',
  backgroundColor: INK.void,
  nebula: {
    primaryColor: '#3b1d60',
    secondaryColor: '#24123d',
    intermediateColor1: '#261240',
    intermediateColor2: '#180a29',
    intensity: 0.70,
    driftSpeed: 1.2,
  },
  stars: {
    density: 1.1,
    speedMultiplier: 1.1,
    brightness: 1.0,
  },
};

export const SOLAR_STORM: EnvironmentDefinition = {
  id: 'solar-storm',
  name: 'Solar Storm',
  backgroundColor: 0x090710,
  nebula: {
    primaryColor: '#4d2211',
    secondaryColor: '#381622',
    intermediateColor1: '#36150b',
    intermediateColor2: '#240d16',
    intensity: 0.60,
    driftSpeed: 1.4,
  },
  stars: {
    density: 0.9,
    speedMultiplier: 1.25,
    brightness: 1.1,
  },
};

export const ENVIRONMENTS: Record<EnvironmentId, EnvironmentDefinition> = {
  'deep-nebula': DEEP_NEBULA,
  'violet-reach': VIOLET_REACH,
  'solar-storm': SOLAR_STORM,
};

export function getEnvironment(id: EnvironmentId): EnvironmentDefinition | undefined {
  return ENVIRONMENTS[id];
}

export function isEnvironmentId(id: string): id is EnvironmentId {
  return Object.prototype.hasOwnProperty.call(ENVIRONMENTS, id);
}

export function resolveEnvironment(id?: string): EnvironmentDefinition {
  if (id && isEnvironmentId(id)) {
    return ENVIRONMENTS[id];
  }
  return DEEP_NEBULA;
}
