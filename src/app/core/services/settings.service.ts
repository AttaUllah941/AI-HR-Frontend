import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';

export interface SettingsSummary {
  company: {
    id: string;
    name: string;
    legalName?: string | null;
    email?: string | null;
    timezone: string;
    locale: string;
    isActive: boolean;
  };
  counts: {
    users: number;
    activeUsers: number;
    roles: number;
    permissions: number;
  };
  config: {
    emailProvider: string;
    storageProvider: string;
    emailApiKeySet: boolean;
  };
}

export interface CompanyProfile {
  id: string;
  name: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  timezone: string;
  locale: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateCompanyBody {
  name?: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  timezone?: string;
  locale?: string;
  isActive?: boolean;
}

export interface SettingsConfig {
  id: string;
  companyId: string;
  email: {
    provider: string;
    from?: string | null;
    smtpUrl?: string | null;
    apiKeySet: boolean;
  };
  storage: {
    provider: string;
    bucket?: string | null;
    region?: string | null;
    publicBaseUrl?: string | null;
  };
  integrations: Record<string, unknown>;
  system: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateEmailBody {
  emailProvider?: 'console' | 'smtp';
  emailFrom?: string | null;
  emailSmtpUrl?: string | null;
  emailApiKey?: string | null;
  clearApiKey?: boolean;
}

export interface UpdateStorageBody {
  storageProvider?: 'local' | 's3' | 'azure' | 'gcs';
  storageBucket?: string | null;
  storageRegion?: string | null;
  storagePublicBaseUrl?: string | null;
}

export interface SettingsRole {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: SettingsPermission[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SettingsPermission {
  id: string;
  code: string;
  module: string;
  action: string;
  description?: string | null;
}

export interface SettingsUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  status: string;
  mfaEnabled: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  roles: Array<{ id: string; code: string; name: string }>;
}

export interface CreateUserBody {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  roleCodes: string[];
  temporaryPassword?: string;
}

export interface UpdateUserBody {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  roleCodes?: string[];
}

export interface CreateUserResult {
  user: SettingsUser;
  temporaryPassword?: string;
}

export interface UsersListParams {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface UsersListResult {
  items: SettingsUser[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditLogItem {
  id: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  actor?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface AuditListParams {
  search?: string;
  entityType?: string;
  actorId?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditListResult {
  items: AuditLogItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly api = inject(ApiService);

  getSummary(): Observable<SettingsSummary> {
    return this.api.get<SettingsSummary>('/settings/summary').pipe(map((res) => this.unwrap(res)));
  }

  getCompany(): Observable<CompanyProfile> {
    return this.api.get<CompanyProfile>('/settings/company').pipe(map((res) => this.unwrap(res)));
  }

  updateCompany(body: UpdateCompanyBody): Observable<CompanyProfile> {
    return this.api
      .patch<CompanyProfile>('/settings/company', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  getConfig(): Observable<SettingsConfig> {
    return this.api.get<SettingsConfig>('/settings/config').pipe(map((res) => this.unwrap(res)));
  }

  updateEmail(body: UpdateEmailBody): Observable<SettingsConfig> {
    return this.api
      .patch<SettingsConfig>('/settings/config/email', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateStorage(body: UpdateStorageBody): Observable<SettingsConfig> {
    return this.api
      .patch<SettingsConfig>('/settings/config/storage', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateIntegrations(integrations: Record<string, unknown>): Observable<SettingsConfig> {
    return this.api
      .patch<SettingsConfig>('/settings/config/integrations', { integrations })
      .pipe(map((res) => this.unwrap(res)));
  }

  updateSystem(system: Record<string, unknown>): Observable<SettingsConfig> {
    return this.api
      .patch<SettingsConfig>('/settings/config/system', { system })
      .pipe(map((res) => this.unwrap(res)));
  }

  listUsers(params: UsersListParams = {}): Observable<UsersListResult> {
    return this.api
      .get<UsersListResult>('/settings/users', params as Record<string, string | number | boolean>)
      .pipe(map((res) => this.unwrap(res)));
  }

  createUser(body: CreateUserBody): Observable<CreateUserResult> {
    return this.api
      .post<CreateUserResult>('/settings/users', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateUser(id: string, body: UpdateUserBody): Observable<SettingsUser> {
    return this.api
      .patch<SettingsUser>(`/settings/users/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteUser(id: string): Observable<{ deleted: boolean }> {
    return this.api
      .delete<{ deleted: boolean }>(`/settings/users/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  listRoles(): Observable<{ items: SettingsRole[] }> {
    return this.api
      .get<{ items: SettingsRole[] }>('/settings/roles')
      .pipe(map((res) => this.unwrap(res)));
  }

  listPermissions(): Observable<{ items: SettingsPermission[] }> {
    return this.api
      .get<{ items: SettingsPermission[] }>('/settings/permissions')
      .pipe(map((res) => this.unwrap(res)));
  }

  updateRolePermissions(roleId: string, permissionCodes: string[]): Observable<SettingsRole> {
    return this.api
      .put<SettingsRole>(`/settings/roles/${roleId}/permissions`, { permissionCodes })
      .pipe(map((res) => this.unwrap(res)));
  }

  listAuditLogs(params: AuditListParams = {}): Observable<AuditListResult> {
    return this.api
      .get<AuditListResult>(
        '/settings/audit-logs',
        params as Record<string, string | number | boolean>,
      )
      .pipe(map((res) => this.unwrap(res)));
  }

  formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  }

  relativeTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const diffMs = Date.now() - d.getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d ago`;
    return this.formatDateTime(iso);
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    return res.data;
  }
}
