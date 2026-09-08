import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse } from '../../../core/models/api.models';
import {
  AttendanceCalendar,
  AttendanceRecord,
  AttendanceSummary,
} from '../models/attendance.models';

@Injectable({ providedIn: 'root' })
export class AttendanceApiService {
  private readonly api = inject(ApiService);

  summary(date?: string): Observable<AttendanceSummary> {
    return this.api
      .get<AttendanceSummary>('/attendance/summary', { date })
      .pipe(map((res) => this.unwrap(res)));
  }

  checkIns(date?: string, limit = 10): Observable<{ date: string; items: AttendanceRecord[] }> {
    return this.api
      .get<{ date: string; items: AttendanceRecord[] }>('/attendance/check-ins', { date, limit })
      .pipe(map((res) => this.unwrap(res)));
  }

  calendar(year: number, month: number): Observable<AttendanceCalendar> {
    return this.api
      .get<AttendanceCalendar>('/attendance/calendar', { year, month })
      .pipe(map((res) => this.unwrap(res)));
  }

  create(payload: Record<string, unknown>): Observable<AttendanceRecord> {
    return this.api
      .post<AttendanceRecord>('/attendance', payload)
      .pipe(map((res) => this.unwrap(res)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    return res.data;
  }
}
