import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';

export interface SecurityPolicy {
  id: string;
  companyId: string;
  maxFailedLogins: number;
  lockoutMinutes: number;
  passwordMinLength: number;
  passwordRequireLetter: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSpecial: boolean;
  requireMfaForPrivileged: boolean;
  allowSelfRegistration: boolean;
  refreshRateLimitPerWindow: number;
  ipAllowlist: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateSecurityPolicyBody {
  maxFailedLogins?: number;
  lockoutMinutes?: number;
  passwordMinLength?: number;
  passwordRequireLetter?: boolean;
  passwordRequireNumber?: boolean;
  passwordRequireSpecial?: boolean;
  requireMfaForPrivileged?: boolean;
  allowSelfRegistration?: boolean;
  refreshRateLimitPerWindow?: number;
  ipAllowlist?: string[] | null;
}

export interface SecurityStatus {
  policy: SecurityPolicy;
  metrics: {
    users: number;
    mfaEnabled: number;
    mfaCoveragePct: number;
    lockedUsers: number;
    privilegedWithoutMfa: number;
    failedLogins24h: number;
  };
  runtime: {
    nodeEnv: string;
    isProduction: boolean;
    helmetEnabled: boolean;
    corsConfigured: boolean;
    globalRateLimit: { windowMs: number; max: number };
    authRateLimit: { windowMs: number; max: number };
    jwtAccessExpiresIn: string;
    jwtRefreshExpiresIn: string;
    jwtSecretsLookStrong: boolean;
  };
}

export interface SecurityReviewCheck {
  id: string;
  title: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

export interface SecurityReview {
  checks: SecurityReviewCheck[];
  summary: { pass: number; warn: number; fail: number };
}

export interface LoginAttemptItem {
  id: string;
  email: string;
  success: boolean;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class SecurityService {
  private readonly api = inject(ApiService);

  getStatus(): Observable<SecurityStatus> {
    return this.api
      .get<SecurityStatus>('/security/status')
      .pipe(map((res) => this.unwrap(res)));
  }

  getReview(): Observable<SecurityReview> {
    return this.api
      .get<SecurityReview>('/security/review')
      .pipe(map((res) => this.unwrap(res)));
  }

  getPolicy(): Observable<SecurityPolicy> {
    return this.api
      .get<SecurityPolicy>('/security/policy')
      .pipe(map((res) => this.unwrap(res)));
  }

  updatePolicy(body: UpdateSecurityPolicyBody): Observable<SecurityPolicy> {
    return this.api
      .patch<SecurityPolicy>('/security/policy', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  listLoginAttempts(params: {
    page?: number;
    pageSize?: number;
    email?: string;
    success?: boolean;
  } = {}): Observable<{
    items: LoginAttemptItem[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    return this.api
      .get<{
        items: LoginAttemptItem[];
        pagination: { page: number; pageSize: number; total: number; totalPages: number };
      }>('/security/login-attempts', params as Record<string, string | number | boolean>)
      .pipe(map((res) => this.unwrap(res)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    return res.data;
  }
}
