import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';

export type ReportType =
  | 'OVERVIEW'
  | 'ATTENDANCE'
  | 'LEAVE'
  | 'PAYROLL'
  | 'RECRUITMENT'
  | 'PERFORMANCE'
  | 'EMPLOYEES';

export type ReportExportFormat = 'CSV' | 'PDF' | 'JSON';

export interface ChartPoint {
  label: string;
  value: number;
}

export interface ReportsSummaryKpis {
  employees: number;
  activeEmployees: number;
  departments: number;
  attendanceToday: number;
  pendingLeave: number;
  openJobs: number;
  candidates: number;
  activeGoals: number;
  openReviews: number;
  payrollRunsYear: number;
}

export interface ReportsModuleLink {
  key: string;
  label: string;
  path: string;
}

export interface ReportExportLog {
  id: string;
  reportType: ReportType | string;
  format: ReportExportFormat | string;
  filters?: unknown;
  rowCount?: number | null;
  fileName?: string | null;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export interface ReportsSummary {
  generatedAt: string;
  range: { dateFrom: string; dateTo: string; year: number };
  kpis: ReportsSummaryKpis;
  charts: {
    attendanceByStatus: ChartPoint[];
    leaveByStatus: ChartPoint[];
    payrollByStatus: ChartPoint[];
    jobsByStatus: ChartPoint[];
    applicationsByStatus: ChartPoint[];
  };
  recentExports: ReportExportLog[];
  modules: ReportsModuleLink[];
}

export interface AttendanceReport {
  dateFrom: string;
  dateTo: string;
  departmentId: string | null;
  totals: { records: number; workMinutes: number; overtimeMinutes: number };
  byStatus: Record<string, number>;
  charts: { byStatus: ChartPoint[]; dailyPresent: ChartPoint[] };
  dailyTrend: Array<Record<string, string | number>>;
  rows: Array<{
    status: string;
    count: number;
    workMinutes: number;
    overtimeMinutes: number;
  }>;
}

export interface LeaveReport {
  year: number;
  employeeId: string | null;
  byStatus: Record<string, number>;
  charts: { byStatus: ChartPoint[]; byType: ChartPoint[] };
  rows: Array<{ status: string; count: number; days: number }>;
  byLeaveType: Array<{
    leaveTypeId: string;
    leaveTypeName: string;
    count: number;
    days: number;
  }>;
}

export interface PayrollReportMonth {
  month: number;
  status: string;
  title: string;
  entryCount: number;
  grossPay: number;
  netPay: number;
  totalTax: number;
  totalDeductions: number;
}

export interface PayrollAnalyticsReport {
  year: number;
  byStatus: Record<string, number>;
  byMonth: PayrollReportMonth[];
  charts: {
    byStatus: ChartPoint[];
    netByMonth: ChartPoint[];
    grossByMonth: ChartPoint[];
  };
  totals: {
    grossPay: number;
    netPay: number;
    totalTax: number;
    runs: number;
  };
}

export interface RecruitmentReport {
  jobOpeningId: string | null;
  jobsByStatus: Record<string, number>;
  applicationsByStatus: Record<string, number>;
  interviewsByStatus: Record<string, number>;
  offersByStatus: Record<string, number>;
  charts: {
    jobsByStatus: ChartPoint[];
    applicationsByStatus: ChartPoint[];
    interviewsByStatus: ChartPoint[];
    offersByStatus: ChartPoint[];
  };
}

export interface PerformanceReport {
  year: number;
  employeeId: string | null;
  goalsByStatus: Record<string, number>;
  reviewsByStatus: Record<string, number>;
  promotionsByStatus: Record<string, number>;
  averageOverallRating: number | null;
  ratedReviewCount: number;
  charts: {
    goalsByStatus: ChartPoint[];
    reviewsByStatus: ChartPoint[];
    promotionsByStatus: ChartPoint[];
  };
}

export interface EmployeesReport {
  departmentId: string | null;
  byStatus: Record<string, number>;
  byEmploymentType: Record<string, number>;
  byDepartment: Array<{
    departmentId: string | null;
    departmentName: string;
    count: number;
  }>;
  headcountTrend: Array<{ year: number; month: number; hired: number; active: number }>;
  charts: {
    byStatus: ChartPoint[];
    byEmploymentType: ChartPoint[];
    byDepartment: ChartPoint[];
    activeHeadcount: ChartPoint[];
  };
  totals: { employees: number; active: number };
}

export interface ReportExportsList {
  items: ReportExportLog[];
}

export interface ReportQueryParams {
  dateFrom?: string;
  dateTo?: string;
  year?: number;
  month?: number;
  departmentId?: string;
  employeeId?: string;
  jobOpeningId?: string;
}

export interface ExportReportBody extends ReportQueryParams {
  reportType: ReportType;
  format: ReportExportFormat;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly api = inject(ApiService);

  getSummary(): Observable<ReportsSummary> {
    return this.api
      .get<ReportsSummary>('/reports/summary')
      .pipe(map((res) => this.unwrap(res)));
  }

  getAttendance(params: ReportQueryParams = {}): Observable<AttendanceReport> {
    return this.api
      .get<AttendanceReport>('/reports/attendance', this.cleanParams(params))
      .pipe(map((res) => this.unwrap(res)));
  }

  getLeave(params: ReportQueryParams = {}): Observable<LeaveReport> {
    return this.api
      .get<LeaveReport>('/reports/leave', this.cleanParams(params))
      .pipe(map((res) => this.unwrap(res)));
  }

  getPayroll(params: ReportQueryParams = {}): Observable<PayrollAnalyticsReport> {
    return this.api
      .get<PayrollAnalyticsReport>('/reports/payroll', this.cleanParams(params))
      .pipe(map((res) => this.unwrap(res)));
  }

  getRecruitment(params: ReportQueryParams = {}): Observable<RecruitmentReport> {
    return this.api
      .get<RecruitmentReport>('/reports/recruitment', this.cleanParams(params))
      .pipe(map((res) => this.unwrap(res)));
  }

  getPerformance(params: ReportQueryParams = {}): Observable<PerformanceReport> {
    return this.api
      .get<PerformanceReport>('/reports/performance', this.cleanParams(params))
      .pipe(map((res) => this.unwrap(res)));
  }

  getEmployees(params: ReportQueryParams = {}): Observable<EmployeesReport> {
    return this.api
      .get<EmployeesReport>('/reports/employees', this.cleanParams(params))
      .pipe(map((res) => this.unwrap(res)));
  }

  listExports(): Observable<ReportExportsList> {
    return this.api
      .get<ReportExportsList>('/reports/exports')
      .pipe(map((res) => this.unwrap(res)));
  }

  exportReport(body: ExportReportBody): Observable<Blob> {
    const stamp = new Date().toISOString().slice(0, 10);
    const ext = body.format.toLowerCase();
    const fileName = `zenith-${body.reportType.toLowerCase()}-${stamp}.${ext}`;
    return this.api.postBlob('/reports/export', body).pipe(
      tap((blob) => this.triggerDownload(blob, fileName)),
    );
  }

  statusLabel(status: string | null | undefined): string {
    if (!status) {
      return '—';
    }
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  monthLabel(month: number): string {
    if (!month || month < 1 || month > 12) {
      return '—';
    }
    return new Date(Date.UTC(2024, month - 1, 1)).toLocaleString('en-US', {
      month: 'short',
      timeZone: 'UTC',
    });
  }

  formatNumber(value: number | null | undefined, digits = 0): string {
    const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return n.toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  reportTypeLabel(type: string | null | undefined): string {
    switch ((type ?? '').toUpperCase()) {
      case 'OVERVIEW':
        return 'Overview';
      case 'ATTENDANCE':
        return 'Attendance';
      case 'LEAVE':
        return 'Leave';
      case 'PAYROLL':
        return 'Payroll';
      case 'RECRUITMENT':
        return 'Recruitment';
      case 'PERFORMANCE':
        return 'Performance';
      case 'EMPLOYEES':
        return 'Employees';
      default:
        return type || '—';
    }
  }

  statusTone(status: string | null | undefined): string {
    const s = (status ?? '').toUpperCase();
    if (
      ['ACTIVE', 'APPROVED', 'PRESENT', 'COMPLETED', 'PAID', 'HIRED', 'ACCEPTED', 'OPEN'].includes(s)
    ) {
      return 'success';
    }
    if (['PENDING', 'DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'SCHEDULED', 'ON_LEAVE'].includes(s)) {
      return 'pending';
    }
    if (['REJECTED', 'CANCELLED', 'ABSENT', 'FAILED', 'TERMINATED', 'CLOSED', 'DECLINED'].includes(s)) {
      return 'error';
    }
    return 'info';
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  private cleanParams(
    params: object,
  ): Record<string, string | number | boolean> {
    const out: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        out[key] = value;
      }
    }
    return out;
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    return res.data;
  }
}
