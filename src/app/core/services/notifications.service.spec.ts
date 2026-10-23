import { describe, expect, it } from 'vitest';
import { describeSendResult } from './notifications.service';

describe('describeSendResult', () => {
  it('reports the server message when nothing was delivered', () => {
    expect(describeSendResult({ items: [], count: 0, message: 'Recipient disabled all channels' })).toBe(
      'Recipient disabled all channels',
    );
  });

  it('falls back to a generic message', () => {
    expect(describeSendResult({ items: [], count: 0 })).toBe('No channels delivered.');
  });

  it('lists skipped channels on partial delivery', () => {
    expect(describeSendResult({ items: [], count: 1, skippedChannels: ['EMAIL', 'PUSH'] })).toBe(
      'Dispatched 1 notification(s). Skipped (disabled by recipient): EMAIL, PUSH.',
    );
  });
});
