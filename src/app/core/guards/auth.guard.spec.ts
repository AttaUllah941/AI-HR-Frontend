import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { authGuard, guestGuard } from './auth.guard';
import { permissionGuard } from './permission.guard';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { AuthUser } from '../models/api.models';

describe('route guards', () => {
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ApiService, useValue: {} }],
    });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    auth.clearSession();
  });

  afterEach(() => {
    auth.clearSession();
  });

  it('authGuard redirects guests to login', () => {
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(result.toString()).toContain('/auth/login');
  });

  it('guestGuard redirects authenticated users to dashboard', () => {
    auth.setSession(
      {
        id: 'u1',
        email: 'a@b.c',
        firstName: 'A',
        lastName: 'B',
        roles: [],
        permissions: [],
      } satisfies AuthUser,
      { accessToken: 'a', refreshToken: 'r' },
    );
    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));
    expect(result.toString()).toContain('/dashboard');
  });

  it('permissionGuard sends unauthorized users to profile', () => {
    auth.setSession(
      {
        id: 'u1',
        email: 'a@b.c',
        firstName: 'A',
        lastName: 'B',
        roles: [],
        permissions: ['dashboard:view'],
      },
      { accessToken: 'a', refreshToken: 'r' },
    );
    const guard = permissionGuard('settings:view');
    const result = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    expect(result.toString()).toContain('/profile');
  });

  it('permissionGuard allows matching permissions', () => {
    auth.setSession(
      {
        id: 'u1',
        email: 'a@b.c',
        firstName: 'A',
        lastName: 'B',
        roles: [],
        permissions: ['settings:view'],
      },
      { accessToken: 'a', refreshToken: 'r' },
    );
    const guard = permissionGuard('settings:view');
    const result = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    expect(result).toBe(true);
    expect(router).toBeTruthy();
  });
});
