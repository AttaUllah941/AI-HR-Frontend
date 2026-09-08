import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse } from '../../../core/models/api.models';
import {
  CompanyHoliday,
  LeaveRequest,
  LeaveSummary,
} from '../models/leave.models';

@Injectable({ providedIn: 'root' })
export class LeaveApiService {
  private readonly api = inject(ApiService);

  summary(): Observable<LeaveSummary> {
    return this.api.get<LeaveSummary>('/leave/summary').pipe(map((res) => this.unwrap(res)));
  }

  pending(limit = 10): Observable<{ items: LeaveRequest[] }> {
    return this.api
      .get<{ items: LeaveRequest[] }>('/leave/pending', { limit })
      .pipe(map((res) => this.unwrap(res)));
  }

  holidays(limit = 8): Observable<{ items: CompanyHoliday[] }> {
    return this.api
      .get<{ items: CompanyHoliday[] }>('/leave/holidays', { limit })
      .pipe(map((res) => this.unwrap(res)));
  }

  create(payload: Record<string, unknown>): Observable<LeaveRequest> {
    return this.api.post<LeaveRequest>('/leave', payload).pipe(map((res) => this.unwrap(res)));
  }

  update(id: string, payload: Record<string, unknown>): Observable<LeaveRequest> {
    return this.api
      .patch<LeaveRequest>(`/leave/${id}`, payload)
      .pipe(map((res) => this.unwrap(res)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    return res.data;
  }
}
