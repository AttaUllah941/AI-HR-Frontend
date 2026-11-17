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

  describe('remember me storage', () => {
    const user: AuthUser = {
      id: 'u1',
      email: 'a@b.c',
      firstName: 'A',
      lastName: 'B',
      roles: [],
      permissions: [],
    };
    const tokens: AuthTokens = { accessToken: 'access', refreshToken: 'refresh' };

    it('stores tokens in localStorage when remember is true', () => {
      auth.setSession(user, tokens, true);
      expect(localStorage.getItem('zh_access_token')).toBe('access');
      expect(sessionStorage.getItem('zh_access_token')).toBeNull();
    });

    it('stores tokens in sessionStorage when remember is false and clears both on logout', () => {
      auth.setSession(user, tokens, false);
      expect(sessionStorage.getItem('zh_access_token')).toBe('access');
      expect(sessionStorage.getItem('zh_refresh_token')).toBe('refresh');
      expect(localStorage.getItem('zh_access_token')).toBeNull();
      expect(auth.getRefreshToken()).toBe('refresh');

      auth.clearSession();
      expect(sessionStorage.getItem('zh_access_token')).toBeNull();
      expect(localStorage.getItem('zh_access_token')).toBeNull();
    });
  });

  it('treats an expired access token without a refresh token as unauthenticated', () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }));
    const expired = `h.${payload}.s`;
    auth.setSession(
      { id: 'u1', email: 'a@b.c', firstName: 'A', lastName: 'B', roles: [], permissions: [] },
      { accessToken: expired, refreshToken: '' },
    );
    expect(auth.isAuthenticated()).toBe(false);
  });
});
