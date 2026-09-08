import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse } from '../../../core/models/api.models';
import { PayrollListResponse, PayrollRun } from '../models/payroll.models';

@Injectable({ providedIn: 'root' })
export class PayrollApiService {
  private readonly api = inject(ApiService);

  summary(year: number, month: number): Observable<PayrollRun> {
    return this.api
      .get<PayrollRun>('/payroll/summary', { year, month })
      .pipe(map((res) => this.unwrap(res)));
  }

  list(params: {
    year: number;
    month: number;
    search?: string;
    departmentId?: string;
    page?: number;
    pageSize?: number;
  }): Observable<PayrollListResponse> {
    return this.api
      .get<PayrollListResponse>('/payroll/entries', params)
      .pipe(map((res) => this.unwrap(res)));
  }

  exportCsv(params: {
    year: number;
    month: number;
    search?: string;
    departmentId?: string;
  }): Observable<string> {
    return this.api.getText('/payroll/export', params);
  }

  runPayroll(year: number, month: number): Observable<PayrollRun> {
    return this.api
      .post<PayrollRun>('/payroll/run', { year, month })
      .pipe(map((res) => this.unwrap(res)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    return res.data;
  }
}
