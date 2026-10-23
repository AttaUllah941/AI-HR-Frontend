import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { parseBlobError } from './error.interceptor';

describe('parseBlobError', () => {
  it('decodes JSON error bodies returned as blobs', async () => {
    const blob = new Blob([JSON.stringify({ message: 'Date range cannot exceed 366 days' })], {
      type: 'application/json',
    });
    const error = new HttpErrorResponse({ error: blob, status: 400 });
    const parsed = await firstValueFrom(parseBlobError(error));
    expect(parsed.error.message).toBe('Date range cannot exceed 366 days');
    expect(parsed.status).toBe(400);
  });

  it('passes non-blob errors through untouched', async () => {
    const error = new HttpErrorResponse({ error: { message: 'x' }, status: 409 });
    expect(await firstValueFrom(parseBlobError(error))).toBe(error);
  });
});
