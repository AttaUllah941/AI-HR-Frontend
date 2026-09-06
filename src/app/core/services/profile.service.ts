import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';

export type ProfileTheme = 'system' | 'light' | 'dark';
export type ProfileTimeFormat = '12h' | '24h';

export interface ProfileEmployeeSummary {
  id: string;
  employeeCode: string;
  status: string;
  joinDate?: string | null;
  workLocation?: string | null;
  department?: { id: string; name: string; code: string } | null;
  designation?: { id: string; name: string; code: string } | null;
  branch?: { id: string; name: string; code: string } | null;
}

export interface UserPreferences {
  theme: ProfileTheme | string;
  locale: string;
  timezone: string;
  dateFormat: string;
  timeFormat: ProfileTimeFormat | string;
  weekStartsOn: number;
  id?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status: string;
  mfaEnabled: boolean;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  passwordChangedAt?: string | null;
  companyId?: string | null;
  roles: string[];
  permissions: string[];
  employee?: ProfileEmployeeSummary | null;
  preferences: UserPreferences;
}

export interface UpdateProfileBody {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResult {
  changed: boolean;
  otherSessionsRevoked: boolean;
}

export interface UpdatePreferencesBody {
  theme?: ProfileTheme;
  locale?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: ProfileTimeFormat;
  weekStartsOn?: number;
}

export interface ProfileSession {
  id: string;
  status: string;
  current: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceLabel: string;
  expiresAt: string;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  active: boolean;
}

export interface ProfileSessionsResult {
  items: ProfileSession[];
}

export interface ProfileActivityItem {
  id: string;
  action: string;
  title: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface ProfileActivityResult {
  items: ProfileActivityItem[];
}

export const PROFILE_THEMES: ProfileTheme[] = ['system', 'light', 'dark'];
export const PROFILE_TIME_FORMATS: ProfileTimeFormat[] = ['12h', '24h'];

export const WEEK_START_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly api = inject(ApiService);

  getProfile(): Observable<UserProfile> {
    return this.api.get<UserProfile>('/profile').pipe(map((res) => this.unwrap(res)));
  }

  updateProfile(body: UpdateProfileBody): Observable<UserProfile> {
    return this.api
      .patch<UserProfile>('/profile', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  changePassword(body: ChangePasswordBody): Observable<ChangePasswordResult> {
    return this.api
      .post<ChangePasswordResult>('/profile/password', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  getPreferences(): Observable<UserPreferences> {
    return this.api
      .get<UserPreferences>('/profile/preferences')
      .pipe(map((res) => this.unwrap(res)));
  }

  updatePreferences(body: UpdatePreferencesBody): Observable<UserPreferences> {
    return this.api
      .put<UserPreferences>('/profile/preferences', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  listSessions(): Observable<ProfileSessionsResult> {
    return this.api
      .get<ProfileSessionsResult>('/profile/sessions')
      .pipe(map((res) => this.unwrap(res)));
  }

  revokeSession(id: string): Observable<{ id: string; revoked: boolean }> {
    return this.api
      .delete<{ id: string; revoked: boolean }>(`/profile/sessions/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  revokeOtherSessions(): Observable<{ revoked: number }> {
    return this.api
      .post<{ revoked: number }>('/profile/sessions/revoke-others')
      .pipe(map((res) => this.unwrap(res)));
  }

  listActivity(limit = 30): Observable<ProfileActivityResult> {
    return this.api
      .get<ProfileActivityResult>('/profile/activity', { limit })
      .pipe(map((res) => this.unwrap(res)));
  }

  statusTone(status: string | null | undefined): 'success' | 'pending' | 'info' | 'error' {
    switch ((status || '').toUpperCase()) {
      case 'ACTIVE':
        return 'success';
      case 'EXPIRED':
      case 'REVOKED':
        return 'pending';
      case 'INACTIVE':
      case 'SUSPENDED':
        return 'error';
      default:
        return 'info';
    }
  }

  formatDateTime(iso: string | null | undefined): string {
    if (!iso) {
      return '—';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return date.toLocaleString();
  }

  relativeTime(iso: string | null | undefined): string {
    if (!iso) {
      return '—';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    const diffMs = Date.now() - date.getTime();
    const sec = Math.round(diffMs / 1000);
    if (sec < 60) {
      return 'Just now';
    }
    const min = Math.round(sec / 60);
    if (min < 60) {
      return `${min}m ago`;
    }
    const hr = Math.round(min / 60);
    if (hr < 24) {
      return `${hr}h ago`;
    }
    const day = Math.round(hr / 24);
    if (day < 7) {
      return `${day}d ago`;
    }
    return date.toLocaleDateString();
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    return res.data;
  }
}
