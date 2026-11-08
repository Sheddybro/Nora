import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('../lib/auth', () => ({ apiRequest: vi.fn() }));

import { normalizeLocationId } from '../lib/catalog';

describe('POS location selection', () => {
  it('normalizes web Picker string IDs to numeric inventory IDs', () => {
    expect(normalizeLocationId('12')).toBe(12);
    expect(normalizeLocationId(12)).toBe(12);
  });
});
