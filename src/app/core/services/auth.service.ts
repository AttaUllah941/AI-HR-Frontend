import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);

  private readonly userSignal = signal<AuthUser | null>(this.readUser());
  private readonly accessTokenSignal = signal<string | null>(this.readAccessToken());

  readonly user = this.userSignal.asReadonly();
  readonly accessToken = this.accessTokenSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.accessTokenSignal());

  getAccessToken(): string | null {
    return this.accessTokenSignal();
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
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

  setSession(user: AuthUser, tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.removeItem(MFA_TOKEN_KEY);
    this.accessTokenSignal.set(tokens.accessToken);
    this.userSignal.set(user);
  }

  clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(MFA_TOKEN_KEY);
    this.accessTokenSignal.set(null);
    this.userSignal.set(null);
  }

  setMfaChallengeToken(token: string): void {
    sessionStorage.setItem(MFA_TOKEN_KEY, token);
  }

  getMfaChallengeToken(): string | null {
    return sessionStorage.getItem(MFA_TOKEN_KEY);
  }

  clearMfaChallengeToken(): void {
    sessionStorage.removeItem(MFA_TOKEN_KEY);
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
    return this.api.post<LoginResponseData>('/auth/login', payload).pipe(
      map((res) => this.unwrap(res)),
      tap((data) => {
        if (!data.mfaRequired) {
          this.setSession(data.user, {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          });
        } else {
          this.setMfaChallengeToken(data.mfaToken);
        }
      }),
    );
  }

  verifyMfa(code: string): Observable<AuthSessionData> {
    const mfaToken = this.getMfaChallengeToken();
    if (!mfaToken) {
      throw new Error('Missing MFA challenge token');
    }

    return this.api
      .post<AuthSessionData>('/auth/mfa/verify', { mfaToken, code })
      .pipe(
        map((res) => this.unwrap(res)),
        tap((data) => {
          this.setSession(data.user, {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          });
          this.clearMfaChallengeToken();
        }),
      );
  }

  refresh(): Observable<AuthSessionData> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('Missing refresh token');
    }

    return this.api
      .post<AuthSessionData>('/auth/refresh', { refreshToken })
      .pipe(
        map((res) => this.unwrap(res)),
        tap((data) => {
          this.setSession(data.user, {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          });
        }),
      );
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    this.api.post('/auth/logout', { refreshToken }).subscribe({
      error: () => undefined,
      complete: () => undefined,
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
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.userSignal.set(user);
      }),
    );
  }

  setupMfa(): Observable<MfaSetupData> {
    return this.api.post<MfaSetupData>('/auth/mfa/setup').pipe(map((res) => this.unwrap(res)));
  }

  enableMfa(code: string): Observable<{ mfaEnabled: boolean }> {
    return this.api.post<{ mfaEnabled: boolean }>('/auth/mfa/enable', { code }).pipe(
      map((res) => this.unwrap(res)),
      tap((data) => {
        const current = this.userSignal();
        if (current) {
          const updated = { ...current, mfaEnabled: data.mfaEnabled };
          localStorage.setItem(USER_KEY, JSON.stringify(updated));
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
          localStorage.setItem(USER_KEY, JSON.stringify(updated));
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

  private readAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  private readUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
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
