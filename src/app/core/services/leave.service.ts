import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';

export type LeaveDayType = 'FULL_DAY' | 'HALF_DAY_AM' | 'HALF_DAY_PM';
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveEmployeeRef {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  department?: { id: string; name: string; code: string } | null;
  designation?: { id: string; name: string; code: string } | null;
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  description: string | null;
  color: string;
  isPaid: boolean;
  requiresApproval: boolean;
  allowHalfDay: boolean;
  maxDaysPerYear: number;
  carryForwardDays: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveTypeRef {
  id: string;
  name: string;
  code: string;
  color: string;
  allowHalfDay?: boolean;
}

export interface LeavePolicy {
  id: string;
  allowNegativeBalance: boolean;
  countWeekends: boolean;
  countHolidays: boolean;
  minNoticeDays: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  entitled: number;
  used: number;
  pending: number;
  carriedForward: number;
  available?: number;
  createdAt?: string;
  updatedAt?: string;
  employee?: LeaveEmployeeRef;
  leaveType?: LeaveTypeRef;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  dayType: LeaveDayType;
  days: number;
  reason: string | null;
  status: LeaveRequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt?: string;
  updatedAt?: string;
  employee?: LeaveEmployeeRef;
  leaveType?: LeaveTypeRef;
}

export interface LeaveMySummary {
  year: number;
  employeeId: string;
  balances: LeaveBalance[];
  pendingRequests: number;
  approvedRequests: number;
  approvedDays: number;
  pendingDays: number;
  remainingDays: number;
}

export interface LeaveCalendarEvent {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  color: string;
  startDate: string;
  endDate: string;
  dayType: LeaveDayType;
  days: number;
  status: LeaveRequestStatus;
}

export interface LeaveReport {
  year: number;
  byStatus: Array<{
    status: LeaveRequestStatus;
    count: number;
    days: number;
  }>;
}

export interface LeaveRequestListParams {
  status?: LeaveRequestStatus | '';
  employeeId?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedLeaveRequests {
  items: LeaveRequest[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface LeaveBalanceListParams {
  year?: number;
  employeeId?: string;
}

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private readonly api = inject(ApiService);

  listTypes(): Observable<LeaveType[]> {
    return this.api
      .get<{ items: LeaveType[] }>('/leave/types')
      .pipe(map((res) => this.unwrap(res).items));
  }

  createType(body: Record<string, unknown>): Observable<LeaveType> {
    return this.api.post<LeaveType>('/leave/types', body).pipe(map((res) => this.unwrap(res)));
  }

  updateType(id: string, body: Record<string, unknown>): Observable<LeaveType> {
    return this.api
      .patch<LeaveType>(`/leave/types/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteType(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/leave/types/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  getPolicy(): Observable<LeavePolicy> {
    return this.api.get<LeavePolicy>('/leave/policy').pipe(map((res) => this.unwrap(res)));
  }

  updatePolicy(body: Record<string, unknown>): Observable<LeavePolicy> {
    return this.api
      .patch<LeavePolicy>('/leave/policy', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  listBalances(params: LeaveBalanceListParams = {}): Observable<LeaveBalance[]> {
    return this.api
      .get<{ items: LeaveBalance[] }>('/leave/balances', params as Record<string, string | number>)
      .pipe(map((res) => this.unwrap(res).items));
  }

  upsertBalance(body: Record<string, unknown>): Observable<LeaveBalance> {
    return this.api
      .post<LeaveBalance>('/leave/balances', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  listRequests(params: LeaveRequestListParams = {}): Observable<PaginatedLeaveRequests> {
    return this.api
      .get<PaginatedLeaveRequests>('/leave/requests', params as Record<string, string | number>)
      .pipe(map((res) => this.unwrap(res)));
  }

  getRequest(id: string): Observable<LeaveRequest> {
    return this.api
      .get<LeaveRequest>(`/leave/requests/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  createRequest(body: Record<string, unknown>): Observable<LeaveRequest> {
    return this.api
      .post<LeaveRequest>('/leave/requests', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateRequest(id: string, body: Record<string, unknown>): Observable<LeaveRequest> {
    return this.api
      .patch<LeaveRequest>(`/leave/requests/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  approveRequest(id: string, body: Record<string, unknown> = {}): Observable<LeaveRequest> {
    return this.api
      .post<LeaveRequest>(`/leave/requests/${id}/approve`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  rejectRequest(id: string, body: Record<string, unknown> = {}): Observable<LeaveRequest> {
    return this.api
      .post<LeaveRequest>(`/leave/requests/${id}/reject`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  cancelRequest(id: string): Observable<LeaveRequest> {
    return this.api
      .post<LeaveRequest>(`/leave/requests/${id}/cancel`, {})
      .pipe(map((res) => this.unwrap(res)));
  }

  getMySummary(year?: number): Observable<LeaveMySummary> {
    return this.api
      .get<LeaveMySummary>('/leave/me/summary', { year })
      .pipe(map((res) => this.unwrap(res)));
  }

  getCalendar(from: string, to: string): Observable<LeaveCalendarEvent[]> {
    return this.api
      .get<{ items: LeaveCalendarEvent[] }>('/leave/calendar', { from, to })
      .pipe(map((res) => this.unwrap(res).items));
  }

  getReport(year?: number): Observable<LeaveReport> {
    return this.api
      .get<LeaveReport>('/leave/report', { year })
      .pipe(map((res) => this.unwrap(res)));
  }

  availableDays(balance: Pick<LeaveBalance, 'entitled' | 'carriedForward' | 'used' | 'pending'>): number {
    return balance.entitled + balance.carriedForward - balance.used - balance.pending;
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    return res.data;
  }
}
