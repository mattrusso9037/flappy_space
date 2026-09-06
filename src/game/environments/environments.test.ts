import { describe, it, expect } from 'vitest';
import {
  ENVIRONMENTS,
  DEFAULT_ENVIRONMENT_ID,
  DEEP_NEBULA,
  VIOLET_REACH,
  SOLAR_STORM,
  getEnvironment,
  isEnvironmentId,
  resolveEnvironment,
} from './environments';

describe('Environment System', () => {
  it('registers all canonical environment presets', () => {
    expect(ENVIRONMENTS['deep-nebula']).toBe(DEEP_NEBULA);
    expect(ENVIRONMENTS['violet-reach']).toBe(VIOLET_REACH);
    expect(ENVIRONMENTS['solar-storm']).toBe(SOLAR_STORM);
  });

  it('validates structure and values of each preset', () => {
    for (const [id, env] of Object.entries(ENVIRONMENTS)) {
      expect(env.id).toBe(id);
      expect(typeof env.name).toBe('string');
      expect(env.name.length).toBeGreaterThan(0);
      expect(typeof env.backgroundColor).toBe('number');

      // Nebula
      expect(typeof env.nebula.primaryColor).toBe('string');
      expect(typeof env.nebula.secondaryColor).toBe('string');
      expect(env.nebula.intensity).toBeGreaterThan(0);
      expect(env.nebula.intensity).toBeLessThanOrEqual(1);
      expect(env.nebula.driftSpeed).toBeGreaterThan(0);

      // Stars
      expect(env.stars.density).toBeGreaterThan(0);
      expect(env.stars.speedMultiplier).toBeGreaterThan(0);
      expect(env.stars.brightness).toBeGreaterThan(0);
    }
  });

  it('resolves valid environment IDs correctly', () => {
    expect(getEnvironment('deep-nebula')).toBe(DEEP_NEBULA);
    expect(getEnvironment('violet-reach')).toBe(VIOLET_REACH);
    expect(getEnvironment('solar-storm')).toBe(SOLAR_STORM);
    expect(getEnvironment('unknown-env')).toBeUndefined();
  });

  it('identifies valid environment IDs with type guard', () => {
    expect(isEnvironmentId('deep-nebula')).toBe(true);
    expect(isEnvironmentId('violet-reach')).toBe(true);
    expect(isEnvironmentId('solar-storm')).toBe(true);
    expect(isEnvironmentId('non-existent')).toBe(false);
  });

  it('falls back safely to DEFAULT_ENVIRONMENT_ID for missing or invalid IDs', () => {
    expect(resolveEnvironment()).toBe(DEEP_NEBULA);
    expect(resolveEnvironment(undefined)).toBe(DEEP_NEBULA);
    expect(resolveEnvironment('')).toBe(DEEP_NEBULA);
    expect(resolveEnvironment('non-existent-env')).toBe(DEEP_NEBULA);
    expect(resolveEnvironment('deep-nebula').id).toBe(DEFAULT_ENVIRONMENT_ID);
  });
});
