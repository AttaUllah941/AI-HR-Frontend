import { Injectable, inject } from '@angular/core';

import { Observable, map } from 'rxjs';

import { ApiService } from './api.service';

import { ApiResponse } from '../models/api.models';



export interface DashboardKpiTrend {

  value: string;

  direction: 'up' | 'down' | 'neutral';

  positive?: boolean;

}



export interface DashboardKpi {

  key: string;

  label: string;

  value: number | string | null;

  subValue?: string;

  trend?: DashboardKpiTrend;

  sparkline?: number[];

  moduleReady?: boolean;

  icon: string;

  tone: string;

}



export interface DashboardAiInsightItem {
  prefix: string;
  highlight: string;
  suffix: string;
}

export interface DashboardAiInsights {
  title: string;
  live: boolean;
  items: DashboardAiInsightItem[];
  ctaLabel: string;
  ctaRoute: string;
}



export interface DashboardAttendancePoint {

  label: string;

  /** ISO day (yyyy-MM-dd); lets the chart tell weekends from absences. */
  date?: string;

  present: number;

  absent: number;

  late?: number;

}



export interface DashboardDepartmentSlice {

  label: string;

  value: number;

  color: string;

}



export interface DashboardFunnelStage {

  label: string;

  value: number;

}



export interface DashboardGrowthPoint {

  label: string;

  value: number;

}



export interface DashboardSummary {

  greeting: {

    firstName: string;

    message: string;

    period: 'morning' | 'afternoon' | 'evening';

    date: string;

  };

  company: { id: string | null; name: string };

  previewMode?: boolean;

  kpis: DashboardKpi[];

  aiInsights: DashboardAiInsights;

  attendanceTrend: {

    period: string;

    series: DashboardAttendancePoint[];

  };

  departmentDistribution: {

    total: number;

    slices: DashboardDepartmentSlice[];

  };

  hiringFunnel: {

    period: string;

    stages: DashboardFunnelStage[];

  };

  employeeGrowth: {

    period: string;

    points: DashboardGrowthPoint[];

  };

  stats: {

    totalUsers: number;

    activeUsers: number;

    activeSessions: number;

    departments: number;

    teams: number;

  };

  modules: Record<string, boolean>;

}



export interface DashboardActivityItem {

  id: string;

  action: string;

  title: string;

  entityType: string | null;

  entityId: string | null;

  actor: { id: string; name: string; email: string } | null;

  createdAt: string;

}



export interface DashboardNotificationItem {

  id: string;

  title: string;

  body: string;

  createdAt: string;

  read: boolean;

}



/**
 * The server only returns the sections the caller is permitted to see, so any section may be
 * empty or missing. Fill in safe defaults so templates never dereference undefined.
 */
export function normalizeDashboardSummary(raw: Partial<DashboardSummary>): DashboardSummary {
  return {
    greeting: raw.greeting ?? { firstName: '', message: 'Welcome', period: 'morning', date: '' },
    company: raw.company ?? { id: null, name: 'Your company' },
    previewMode: raw.previewMode ?? false,
    kpis: raw.kpis ?? [],
    aiInsights: {
      title: raw.aiInsights?.title ?? 'AI Insights',
      live: raw.aiInsights?.live ?? false,
      items: raw.aiInsights?.items ?? [],
      ctaLabel: raw.aiInsights?.ctaLabel ?? '',
      ctaRoute: raw.aiInsights?.ctaRoute ?? '/ai/assistant',
    },
    attendanceTrend: {
      period: raw.attendanceTrend?.period ?? '',
      series: raw.attendanceTrend?.series ?? [],
    },
    departmentDistribution: {
      total: raw.departmentDistribution?.total ?? 0,
      slices: raw.departmentDistribution?.slices ?? [],
    },
    hiringFunnel: {
      period: raw.hiringFunnel?.period ?? '',
      stages: raw.hiringFunnel?.stages ?? [],
    },
    employeeGrowth: {
      period: raw.employeeGrowth?.period ?? '',
      points: raw.employeeGrowth?.points ?? [],
    },
    stats: {
      totalUsers: raw.stats?.totalUsers ?? 0,
      activeUsers: raw.stats?.activeUsers ?? 0,
      activeSessions: raw.stats?.activeSessions ?? 0,
      departments: raw.stats?.departments ?? 0,
      teams: raw.stats?.teams ?? 0,
    },
    modules: raw.modules ?? {},
  };
}

@Injectable({ providedIn: 'root' })

export class DashboardService {

  private readonly api = inject(ApiService);



  getSummary(): Observable<DashboardSummary> {

    return this.api

      .get<DashboardSummary>('/dashboard/summary')

      .pipe(map((res) => normalizeDashboardSummary(this.unwrap(res))));

  }



  getGreeting(): Observable<{
    greeting: DashboardSummary['greeting'];
    company: DashboardSummary['company'];
  }> {
    return this.api
      .get<{ greeting: DashboardSummary['greeting']; company: DashboardSummary['company'] }>(
        '/dashboard/greeting',
      )
      .pipe(map((res) => this.unwrap(res)));
  }



  getActivity(limit = 12): Observable<{ items: DashboardActivityItem[] }> {

    return this.api

      .get<{ items: DashboardActivityItem[] }>('/dashboard/activity', { limit })

      .pipe(map((res) => this.unwrap(res)));

  }



  getNotifications(limit = 8): Observable<{

    unreadCount: number;

    items: DashboardNotificationItem[];

  }> {

    return this.api

      .get<{ unreadCount: number; items: DashboardNotificationItem[] }>(

        '/dashboard/notifications',

        { limit },

      )

      .pipe(map((res) => this.unwrap(res)));

  }



  private unwrap<T>(res: ApiResponse<T>): T {

    if (!res.success) {

      throw new Error(res.message || 'Request failed');

    }

    return res.data;

  }

}


