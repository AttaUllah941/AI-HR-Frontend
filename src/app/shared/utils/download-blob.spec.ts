import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from './download-blob';

describe('downloadBlob', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clicks a temporary anchor and revokes the object URL after a delay', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    downloadBlob(new Blob(['a,b']), 'report.csv');

    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[download="report.csv"]')).toBeNull();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    click.mockRestore();
  });
});
