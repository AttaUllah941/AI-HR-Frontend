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

  present: number;

  absent: number;

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

  previewMode: boolean;

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



@Injectable({ providedIn: 'root' })

export class DashboardService {

  private readonly api = inject(ApiService);



  getSummary(): Observable<DashboardSummary> {

    return this.api

      .get<DashboardSummary>('/dashboard/summary')

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


