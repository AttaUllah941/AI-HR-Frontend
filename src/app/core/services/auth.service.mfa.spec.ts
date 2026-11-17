import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { AuthUser } from '../models/api.models';

describe('AuthService MFA setup', () => {
  const post = vi.fn();
  let auth: AuthService;

  const user: AuthUser = {
    id: 'u1',
    email: 'a@b.c',
    firstName: 'A',
    lastName: 'B',
    roles: [],
    permissions: [],
    mfaEnabled: true,
  };

  beforeEach(() => {
    post.mockReset();
    post.mockReturnValue(
      of({ success: true, message: 'ok', data: { secret: 's', otpauthUrl: 'otpauth://x' } }),
    );
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ApiService, useValue: { post } }],
    });
    auth = TestBed.inject(AuthService);
    auth.setSession(user, { accessToken: 'access', refreshToken: 'refresh' });
  });

  afterEach(() => auth.clearSession());

  it('sends an empty body for first-time setup', async () => {
    await firstValueFrom(auth.setupMfa());
    expect(post).toHaveBeenCalledWith('/auth/mfa/setup', {});
  });

  it('sends password and code when re-setting up and marks MFA as off until confirmed', async () => {
    await firstValueFrom(auth.setupMfa({ password: 'pw', code: '123456' }));
    expect(post).toHaveBeenCalledWith('/auth/mfa/setup', { password: 'pw', code: '123456' });
    expect(auth.user()?.mfaEnabled).toBe(false);
  });
});
