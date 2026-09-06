import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';

export type NotificationCategory =
  | 'SYSTEM'
  | 'LEAVE'
  | 'ATTENDANCE'
  | 'PAYROLL'
  | 'RECRUITMENT'
  | 'PERFORMANCE'
  | 'AI'
  | 'SECURITY'
  | 'OTHER';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'PUSH';

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'READ';

export type PushPlatform = 'WEB' | 'IOS' | 'ANDROID';

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  'SYSTEM',
  'LEAVE',
  'ATTENDANCE',
  'PAYROLL',
  'RECRUITMENT',
  'PERFORMANCE',
  'AI',
  'SECURITY',
  'OTHER',
];

export const NOTIFICATION_CHANNELS: NotificationChannel[] = ['IN_APP', 'EMAIL', 'PUSH'];

export const PUSH_PLATFORMS: PushPlatform[] = ['WEB', 'IOS', 'ANDROID'];

export interface NotificationProvidersStatus {
  emailProvider: string;
  pushProvider: string;
  channels: NotificationChannel[];
  categories: NotificationCategory[];
}

export interface NotificationItem {
  id: string;
  companyId?: string;
  userId?: string;
  templateId?: string | null;
  category: NotificationCategory | string;
  channel: NotificationChannel | string;
  title: string;
  body: string;
  data?: unknown;
  status: NotificationStatus | string;
  readAt?: string | null;
  sentAt?: string | null;
  emailTo?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationFeedItem {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory | string;
  createdAt: string;
  read: boolean;
  data?: unknown;
}

export interface NotificationsSummary {
  unreadCount: number;
  totalByCategory: Record<string, number>;
  unreadByCategory: Record<string, number>;
  recent: NotificationItem[];
  providers: NotificationProvidersStatus;
}

export interface NotificationsFeed {
  unreadCount: number;
  items: NotificationFeedItem[];
}

export interface NotificationsListParams {
  category?: NotificationCategory | string;
  channel?: NotificationChannel | string;
  status?: NotificationStatus | string;
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface NotificationsListResult {
  items: NotificationItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface NotificationPreference {
  category: NotificationCategory | string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
}

export interface NotificationPreferencesResult {
  preferences: NotificationPreference[];
}

export interface NotificationTemplate {
  id: string;
  companyId?: string;
  code: string;
  name: string;
  category: NotificationCategory | string;
  channel: NotificationChannel | string;
  subject?: string | null;
  bodyTemplate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateNotificationTemplateBody {
  code: string;
  name: string;
  category?: NotificationCategory | string;
  channel?: NotificationChannel | string;
  subject?: string | null;
  bodyTemplate: string;
  isActive?: boolean;
}

export interface UpdateNotificationTemplateBody {
  code?: string;
  name?: string;
  category?: NotificationCategory | string;
  channel?: NotificationChannel | string;
  subject?: string | null;
  bodyTemplate?: string;
  isActive?: boolean;
}

export interface PushDevice {
  id: string;
  companyId?: string;
  userId?: string;
  platform: PushPlatform | string;
  token: string;
  label?: string | null;
  isActive: boolean;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RegisterDeviceBody {
  token: string;
  platform?: PushPlatform | string;
  label?: string | null;
}

export interface SendNotificationBody {
  userId: string;
  title: string;
  body: string;
  category?: NotificationCategory | string;
  channels?: NotificationChannel[];
  templateCode?: string;
  data?: Record<string, unknown>;
}

export interface SendNotificationResult {
  items: NotificationItem[];
  count: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly api = inject(ApiService);

  getStatus(): Observable<NotificationProvidersStatus> {
    return this.api
      .get<NotificationProvidersStatus>('/notifications/status')
      .pipe(map((res) => this.unwrap(res)));
  }

  getSummary(): Observable<NotificationsSummary> {
    return this.api
      .get<NotificationsSummary>('/notifications/summary')
      .pipe(map((res) => this.unwrap(res)));
  }

  getFeed(limit = 8): Observable<NotificationsFeed> {
    return this.api
      .get<NotificationsFeed>('/notifications/feed', { limit })
      .pipe(map((res) => this.unwrap(res)));
  }

  list(params: NotificationsListParams = {}): Observable<NotificationsListResult> {
    return this.api
      .get<NotificationsListResult>('/notifications', {
        category: params.category,
        channel: params.channel,
        status: params.status,
        unreadOnly:
          params.unreadOnly === undefined ? undefined : params.unreadOnly ? 'true' : 'false',
        page: params.page,
        pageSize: params.pageSize,
      })
      .pipe(map((res) => this.unwrap(res)));
  }

  getOne(id: string): Observable<NotificationItem> {
    return this.api
      .get<NotificationItem>(`/notifications/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  markRead(id: string): Observable<NotificationItem> {
    return this.api
      .post<NotificationItem>(`/notifications/${id}/read`)
      .pipe(map((res) => this.unwrap(res)));
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.api
      .post<{ updated: number }>('/notifications/read-all')
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteOne(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/notifications/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  getPreferences(): Observable<NotificationPreferencesResult> {
    return this.api
      .get<NotificationPreferencesResult>('/notifications/preferences')
      .pipe(map((res) => this.unwrap(res)));
  }

  upsertPreferences(
    preferences: NotificationPreference[],
  ): Observable<NotificationPreferencesResult> {
    return this.api
      .put<NotificationPreferencesResult>('/notifications/preferences', { preferences })
      .pipe(map((res) => this.unwrap(res)));
  }

  listTemplates(): Observable<{ items: NotificationTemplate[] }> {
    return this.api
      .get<{ items: NotificationTemplate[] }>('/notifications/templates')
      .pipe(map((res) => this.unwrap(res)));
  }

  createTemplate(body: CreateNotificationTemplateBody): Observable<NotificationTemplate> {
    return this.api
      .post<NotificationTemplate>('/notifications/templates', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateTemplate(
    id: string,
    body: UpdateNotificationTemplateBody,
  ): Observable<NotificationTemplate> {
    return this.api
      .patch<NotificationTemplate>(`/notifications/templates/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteTemplate(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/notifications/templates/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  listDevices(): Observable<{ items: PushDevice[] }> {
    return this.api
      .get<{ items: PushDevice[] }>('/notifications/devices')
      .pipe(map((res) => this.unwrap(res)));
  }

  registerDevice(body: RegisterDeviceBody): Observable<PushDevice> {
    return this.api
      .post<PushDevice>('/notifications/devices', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  removeDevice(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/notifications/devices/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  send(body: SendNotificationBody): Observable<SendNotificationResult> {
    return this.api
      .post<SendNotificationResult>('/notifications/send', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  isRead(item: Pick<NotificationItem, 'readAt' | 'status'> | NotificationFeedItem): boolean {
    if ('read' in item) {
      return !!item.read;
    }
    return item.readAt != null || item.status === 'READ';
  }

  categoryLabel(category: string | null | undefined): string {
    if (!category) {
      return '—';
    }
    return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  channelLabel(channel: string | null | undefined): string {
    if (!channel) {
      return '—';
    }
    if (channel === 'IN_APP') {
      return 'In-app';
    }
    return channel.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  statusLabel(status: string | null | undefined): string {
    if (!status) {
      return '—';
    }
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  statusTone(status: string | null | undefined): 'success' | 'pending' | 'info' | 'error' {
    switch (status) {
      case 'SENT':
      case 'READ':
        return 'success';
      case 'PENDING':
        return 'pending';
      case 'FAILED':
        return 'error';
      default:
        return 'info';
    }
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
