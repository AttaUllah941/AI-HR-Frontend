import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, finalize, map, shareReplay, tap, throwError } from 'rxjs';
import { ApiService } from './api.service';
import {
  ApiResponse,
  AuthTokens,
  AuthUser,
  ForgotPasswordResponseData,
  LoginResponseData,
  MfaSetupData,
  RegisterResponseData,
  AuthSessionData,
} from '../models/api.models';

const ACCESS_TOKEN_KEY = 'zh_access_token';
const REFRESH_TOKEN_KEY = 'zh_refresh_token';
const USER_KEY = 'zh_user';
const MFA_TOKEN_KEY = 'zh_mfa_token';
const REMEMBER_KEY = 'zh_mfa_remember';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);

  private readonly userSignal = signal<AuthUser | null>(this.readUser());
  private readonly accessTokenSignal = signal<string | null>(this.readAccessToken());
  private readonly refreshTokenSignal = signal<string | null>(this.readStored(REFRESH_TOKEN_KEY));
  private refreshInFlight$: Observable<AuthSessionData> | null = null;

  readonly user = this.userSignal.asReadonly();
  readonly accessToken = this.accessTokenSignal.asReadonly();
  readonly isAuthenticated = computed(() => {
    const token = this.accessTokenSignal();
    if (!token) {
      return false;
    }
    // An expired access token can only be recovered through a refresh token.
    return !isJwtExpired(token) || !!this.refreshTokenSignal();
  });

  getAccessToken(): string | null {
    return this.accessTokenSignal();
  }

  getRefreshToken(): string | null {
    return this.refreshTokenSignal();
  }

  hasPermission(permission: string): boolean {
    return this.userSignal()?.permissions.includes(permission) ?? false;
  }

  hasAnyPermission(...permissions: string[]): boolean {
    return permissions.some((permission) => this.hasPermission(permission));
  }

  hasRole(role: string): boolean {
    return this.userSignal()?.roles.includes(role) ?? false;
  }

  /**
   * Persists the session. `remember` selects localStorage (survives browser restarts)
   * or sessionStorage (cleared when the tab closes). When omitted, the storage that
   * currently holds the session is reused (e.g. token refresh), defaulting to localStorage.
   */
  setSession(user: AuthUser, tokens: AuthTokens, remember?: boolean): void {
    const persistent = remember ?? this.isPersistentSession();
    const target = persistent ? localStorage : sessionStorage;
    this.removeStoredSession();
    target.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    target.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    target.setItem(USER_KEY, JSON.stringify(user));
    this.clearMfaChallengeToken();
    this.accessTokenSignal.set(tokens.accessToken);
    this.refreshTokenSignal.set(tokens.refreshToken);
    this.userSignal.set(user);
  }

  clearSession(): void {
    this.removeStoredSession();
    this.clearMfaChallengeToken();
    this.refreshInFlight$ = null;
    this.accessTokenSignal.set(null);
    this.refreshTokenSignal.set(null);
    this.userSignal.set(null);
  }

  setMfaChallengeToken(token: string, remember = true): void {
    sessionStorage.setItem(MFA_TOKEN_KEY, token);
    sessionStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
  }

  getMfaChallengeToken(): string | null {
    return sessionStorage.getItem(MFA_TOKEN_KEY);
  }

  clearMfaChallengeToken(): void {
    sessionStorage.removeItem(MFA_TOKEN_KEY);
    sessionStorage.removeItem(REMEMBER_KEY);
    localStorage.removeItem(MFA_TOKEN_KEY);
  }

  register(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyName?: string;
  }): Observable<RegisterResponseData> {
    return this.api
      .post<RegisterResponseData>('/auth/register', payload)
      .pipe(map((res) => this.unwrap(res)));
  }

  login(payload: {
    email: string;
    password: string;
    remember?: boolean;
  }): Observable<LoginResponseData> {
    const remember = payload.remember ?? true;
    return this.api.post<LoginResponseData>('/auth/login', payload).pipe(
      map((res) => this.unwrap(res)),
      tap((data) => {
        if (!data.mfaRequired) {
          this.setSession(
            data.user,
            {
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
            },
            remember,
          );
        } else {
          this.setMfaChallengeToken(data.mfaToken, remember);
        }
      }),
    );
  }

  verifyMfa(code: string): Observable<AuthSessionData> {
    const mfaToken = this.getMfaChallengeToken();
    if (!mfaToken) {
      return throwError(() => new Error('Missing MFA challenge token'));
    }
    const remember = sessionStorage.getItem(REMEMBER_KEY) !== '0';

    return this.api.post<AuthSessionData>('/auth/mfa/verify', { mfaToken, code }).pipe(
      map((res) => this.unwrap(res)),
      tap((data) => {
        this.setSession(
          data.user,
          {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          },
          remember,
        );
      }),
    );
  }

  refresh(): Observable<AuthSessionData> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('Missing refresh token'));
    }

    this.refreshInFlight$ = this.api.post<AuthSessionData>('/auth/refresh', { refreshToken }).pipe(
      map((res) => this.unwrap(res)),
      tap((data) => {
        this.setSession(data.user, {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
      }),
      finalize(() => {
        this.refreshInFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.refreshInFlight$;
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    this.api.post('/auth/logout', { refreshToken }).subscribe({
      error: () => undefined,
    });
    this.clearSession();
    void this.router.navigate(['/auth/login']);
  }

  forgotPassword(email: string): Observable<ForgotPasswordResponseData> {
    return this.api
      .post<ForgotPasswordResponseData>('/auth/forgot-password', { email })
      .pipe(map((res) => this.unwrap(res)));
  }

  resetPassword(token: string, password: string): Observable<{ reset: boolean }> {
    return this.api
      .post<{ reset: boolean }>('/auth/reset-password', { token, password })
      .pipe(map((res) => this.unwrap(res)));
  }

  verifyEmail(token: string): Observable<{ verified: boolean }> {
    return this.api
      .post<{ verified: boolean }>('/auth/verify-email', { token })
      .pipe(map((res) => this.unwrap(res)));
  }

  me(): Observable<AuthUser> {
    return this.api.get<AuthUser>('/auth/me').pipe(
      map((res) => this.unwrap(res)),
      tap((user) => {
        this.userStorage().setItem(USER_KEY, JSON.stringify(user));
        this.userSignal.set(user);
      }),
    );
  }

  /** Password and code are required by the server when MFA is already enabled (re-setup). */
  setupMfa(credentials?: { password: string; code: string }): Observable<MfaSetupData> {
    return this.api
      .post<MfaSetupData>('/auth/mfa/setup', credentials ?? {})
      .pipe(
        map((res) => this.unwrap(res)),
        tap(() => {
          // Setup replaces the secret and leaves MFA off until it is confirmed again.
          const current = this.userSignal();
          if (current?.mfaEnabled) {
            const updated = { ...current, mfaEnabled: false };
            this.userStorage().setItem(USER_KEY, JSON.stringify(updated));
            this.userSignal.set(updated);
          }
        }),
      );
  }

  enableMfa(code: string): Observable<{ mfaEnabled: boolean }> {
    return this.api.post<{ mfaEnabled: boolean }>('/auth/mfa/enable', { code }).pipe(
      map((res) => this.unwrap(res)),
      tap((data) => {
        const current = this.userSignal();
        if (current) {
          const updated = { ...current, mfaEnabled: data.mfaEnabled };
          this.userStorage().setItem(USER_KEY, JSON.stringify(updated));
          this.userSignal.set(updated);
        }
      }),
    );
  }

  disableMfa(password: string, code: string): Observable<{ mfaEnabled: boolean }> {
    return this.api.post<{ mfaEnabled: boolean }>('/auth/mfa/disable', { password, code }).pipe(
      map((res) => this.unwrap(res)),
      tap((data) => {
        const current = this.userSignal();
        if (current) {
          const updated = { ...current, mfaEnabled: data.mfaEnabled };
          this.userStorage().setItem(USER_KEY, JSON.stringify(updated));
          this.userSignal.set(updated);
        }
      }),
    );
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    return res.data;
  }

  private readStored(key: string): string | null {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  }

  private isPersistentSession(): boolean {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY) === null;
  }

  private userStorage(): Storage {
    return localStorage.getItem(ACCESS_TOKEN_KEY) !== null ? localStorage : sessionStorage;
  }

  private removeStoredSession(): void {
    for (const key of [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  }

  private readAccessToken(): string | null {
    return this.readStored(ACCESS_TOKEN_KEY);
  }

  private readUser(): AuthUser | null {
    const raw = this.readStored(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}

function isJwtExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return false;
    }
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === 'number' && exp * 1000 <= Date.now();
  } catch {
    // Not a decodable JWT: let the server decide.
    return false;
  }
}
