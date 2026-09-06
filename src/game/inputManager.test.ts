import { describe, it, expect } from 'vitest';
import { InputKey, formatInputKey, getUseToolKeyLabel } from './inputManager';

describe('InputManager Key Formatting', () => {
  it('formats letter keys by stripping Key prefix and uppercasing', () => {
    expect(formatInputKey(InputKey.USE_TOOL)).toBe('E');
    expect(formatInputKey(InputKey.W)).toBe('W');
    expect(formatInputKey(InputKey.A)).toBe('A');
    expect(formatInputKey(InputKey.S)).toBe('S');
    expect(formatInputKey(InputKey.D)).toBe('D');
    expect(formatInputKey(InputKey.REMOVE_TOOL)).toBe('X');
  });

  it('formats digit keys by stripping Digit prefix', () => {
    expect(formatInputKey(InputKey.SELECT_TOOL)).toBe('1');
    expect(formatInputKey(InputKey.UNEQUIP_TOOL)).toBe('0');
  });

  it('formats special keys like Space and Arrow keys', () => {
    expect(formatInputKey(InputKey.SPACE)).toBe('SPACE');
    expect(formatInputKey(InputKey.ARROW_UP)).toBe('UP ARROW');
    expect(formatInputKey(InputKey.ARROW_DOWN)).toBe('DOWN ARROW');
    expect(formatInputKey(InputKey.ARROW_LEFT)).toBe('LEFT ARROW');
    expect(formatInputKey(InputKey.ARROW_RIGHT)).toBe('RIGHT ARROW');
  });

  it('provides getUseToolKeyLabel reflecting InputKey.USE_TOOL', () => {
    expect(getUseToolKeyLabel()).toBe('E');
  });
});
