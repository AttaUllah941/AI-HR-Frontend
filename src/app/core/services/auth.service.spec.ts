import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { AuthTokens, AuthUser } from '../models/api.models';

describe('AuthService', () => {
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ApiService, useValue: {} }],
    });
    auth = TestBed.inject(AuthService);
    auth.clearSession();
  });

  afterEach(() => {
    auth.clearSession();
  });

  it('reports unauthenticated without tokens', () => {
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.hasPermission('dashboard:view')).toBe(false);
  });

  it('tracks session permissions after setSession', () => {
    const user: AuthUser = {
      id: 'u1',
      email: 'admin@zenith.local',
      firstName: 'Ada',
      lastName: 'Admin',
      roles: ['HR_ADMIN'],
      permissions: ['dashboard:view', 'settings:update'],
    };
    const tokens: AuthTokens = { accessToken: 'access', refreshToken: 'refresh' };
    auth.setSession(user, tokens);

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.hasPermission('dashboard:view')).toBe(true);
    expect(auth.hasPermission('employees:delete')).toBe(false);
    expect(auth.hasAnyPermission('employees:delete', 'settings:update')).toBe(true);
    expect(auth.hasRole('HR_ADMIN')).toBe(true);
  });
});
