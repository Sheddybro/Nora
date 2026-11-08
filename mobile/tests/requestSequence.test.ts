import { describe, expect, it } from 'vitest';
import { RequestSequence } from '../lib/requestSequence';

describe('RequestSequence', () => {
  it('only treats the most recently started request as current', () => {
    const sequence = new RequestSequence();
    const earlier = sequence.begin();
    const latest = sequence.begin();

    expect(sequence.isCurrent(earlier)).toBe(false);
    expect(sequence.isCurrent(latest)).toBe(true);
  });

  it('invalidates in-flight requests when the screen loses focus', () => {
    const sequence = new RequestSequence();
    const request = sequence.begin();

    sequence.invalidate();

    expect(sequence.isCurrent(request)).toBe(false);
  });
});
