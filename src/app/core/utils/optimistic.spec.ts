import { Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { optimistic } from './optimistic';

describe('optimistic', () => {
  it('applies immediately, before the request completes', () => {
    const apply = vi.fn();
    const pending = new Subject<string>();
    optimistic({ apply, rollback: vi.fn(), request$: pending });
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('keeps the change and reports success', () => {
    const rollback = vi.fn();
    const onSuccess = vi.fn();
    optimistic({ apply: vi.fn(), rollback, request$: of('ok'), onSuccess });
    expect(onSuccess).toHaveBeenCalledWith('ok');
    expect(rollback).not.toHaveBeenCalled();
  });

  it('rolls back and reports the error when the request fails', () => {
    const order: string[] = [];
    const failure = new Error('nope');
    optimistic({
      apply: () => order.push('apply'),
      rollback: () => order.push('rollback'),
      request$: throwError(() => failure),
      onError: (e) => order.push(e === failure ? 'error' : 'wrong'),
    });
    expect(order).toEqual(['apply', 'rollback', 'error']);
  });
});
