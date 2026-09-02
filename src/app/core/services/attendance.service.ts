import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';

export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'HALF_DAY'
  | 'ON_LEAVE'
  | 'HOLIDAY'
  | 'WEEKEND'
  | 'REMOTE'
  | 'EARLY_LEAVE';

export type OvertimeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AttendanceEmployeeRef {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  department: { id: string; name: string; code: string } | null;
  designation: { id: string; name: string; code: string } | null;
}

export interface Shift {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  graceMinutes: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShiftRef {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  breakMinutes: number;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  isOptional: boolean;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  shiftId: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInIp: string | null;
  checkOutIp: string | null;
  status: AttendanceStatus;
  workMinutes: number;
  overtimeMinutes: number;
  lateMinutes: number;
  notes: string | null;
  source: string;
  createdAt?: string;
  updatedAt?: string;
  employee?: AttendanceEmployeeRef;
  shift?: ShiftRef | null;
}

export interface AttendanceSummary {
  date: string;
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  remote: number;
  halfDay: number;
  holiday: number;
  workHours: number;
  overtimeHours: number;
  byStatus: Record<string, number>;
}

export interface MyTodayResponse {
  date: string;
  employeeId: string;
  shift: Shift | null;
  record: AttendanceRecord | null;
}

export interface AttendanceListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AttendanceStatus | '';
  employeeId?: string;
  departmentId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortDir?: 'asc' | 'desc';
}

export interface PaginatedAttendance {
  items: AttendanceRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface TimesheetParams {
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TimesheetResponse {
  employeeId: string;
  dateFrom: string;
  dateTo: string;
  items: AttendanceRecord[];
  totals: {
    workMinutes: number;
    overtimeMinutes: number;
    lateMinutes: number;
  };
}

export interface AttendanceReportParams {
  dateFrom?: string;
  dateTo?: string;
}

export interface AttendanceReport {
  dateFrom: string;
  dateTo: string;
  rows: Array<{
    status: AttendanceStatus;
    count: number;
    workMinutes: number;
    overtimeMinutes: number;
  }>;
}

export interface OvertimeRequest {
  id: string;
  employeeId: string;
  attendanceId: string | null;
  date: string;
  minutes: number;
  reason: string | null;
  status: OvertimeStatus;
  reviewNotes: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  employee?: AttendanceEmployeeRef;
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly api = inject(ApiService);

  getSummary(date?: string): Observable<AttendanceSummary> {
    return this.api
      .get<AttendanceSummary>('/attendance/summary', { date })
      .pipe(map((res) => this.unwrap(res)));
  }

  listRecords(params: AttendanceListParams = {}): Observable<PaginatedAttendance> {
    return this.api
      .get<PaginatedAttendance>('/attendance/records', params as Record<string, string | number>)
      .pipe(map((res) => this.unwrap(res)));
  }

  getRecord(id: string): Observable<AttendanceRecord> {
    return this.api
      .get<AttendanceRecord>(`/attendance/records/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  createRecord(body: Record<string, unknown>): Observable<AttendanceRecord> {
    return this.api
      .post<AttendanceRecord>('/attendance/records', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateRecord(id: string, body: Record<string, unknown>): Observable<AttendanceRecord> {
    return this.api
      .patch<AttendanceRecord>(`/attendance/records/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteRecord(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/attendance/records/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  clockIn(notes?: string): Observable<AttendanceRecord> {
    return this.api
      .post<AttendanceRecord>('/attendance/clock-in', notes ? { notes } : {})
      .pipe(map((res) => this.unwrap(res)));
  }

  clockOut(notes?: string): Observable<AttendanceRecord> {
    return this.api
      .post<AttendanceRecord>('/attendance/clock-out', notes ? { notes } : {})
      .pipe(map((res) => this.unwrap(res)));
  }

  getMyToday(): Observable<MyTodayResponse> {
    return this.api
      .get<MyTodayResponse>('/attendance/me/today')
      .pipe(map((res) => this.unwrap(res)));
  }

  getTimesheet(params: TimesheetParams = {}): Observable<TimesheetResponse> {
    return this.api
      .get<TimesheetResponse>('/attendance/timesheet', params as Record<string, string>)
      .pipe(map((res) => this.unwrap(res)));
  }

  getReport(params: AttendanceReportParams = {}): Observable<AttendanceReport> {
    return this.api
      .get<AttendanceReport>('/attendance/report', params as Record<string, string>)
      .pipe(map((res) => this.unwrap(res)));
  }

  listShifts(): Observable<Shift[]> {
    return this.api
      .get<{ items: Shift[] }>('/attendance/shifts')
      .pipe(map((res) => this.unwrap(res).items));
  }

  createShift(body: Record<string, unknown>): Observable<Shift> {
    return this.api.post<Shift>('/attendance/shifts', body).pipe(map((res) => this.unwrap(res)));
  }

  updateShift(id: string, body: Record<string, unknown>): Observable<Shift> {
    return this.api
      .patch<Shift>(`/attendance/shifts/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteShift(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/attendance/shifts/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  listHolidays(year?: number): Observable<Holiday[]> {
    return this.api
      .get<{ items: Holiday[] }>('/attendance/holidays', { year })
      .pipe(map((res) => this.unwrap(res).items));
  }

  createHoliday(body: Record<string, unknown>): Observable<Holiday> {
    return this.api
      .post<Holiday>('/attendance/holidays', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateHoliday(id: string, body: Record<string, unknown>): Observable<Holiday> {
    return this.api
      .patch<Holiday>(`/attendance/holidays/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteHoliday(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/attendance/holidays/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  listOvertime(status?: OvertimeStatus | ''): Observable<OvertimeRequest[]> {
    return this.api
      .get<{ items: OvertimeRequest[] }>('/attendance/overtime', { status: status || undefined })
      .pipe(map((res) => this.unwrap(res).items));
  }

  createOvertime(body: Record<string, unknown>): Observable<OvertimeRequest> {
    return this.api
      .post<OvertimeRequest>('/attendance/overtime', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  approveOvertime(id: string, body: Record<string, unknown> = {}): Observable<OvertimeRequest> {
    return this.api
      .post<OvertimeRequest>(`/attendance/overtime/${id}/approve`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  rejectOvertime(id: string, body: Record<string, unknown> = {}): Observable<OvertimeRequest> {
    return this.api
      .post<OvertimeRequest>(`/attendance/overtime/${id}/reject`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    return res.data;
  }
}
