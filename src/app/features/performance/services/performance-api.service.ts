import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse } from '../../../core/models/api.models';
import {
  PerformanceInsight,
  PerformanceReview,
  PerformanceSummary,
} from '../models/performance.models';

@Injectable({ providedIn: 'root' })
export class PerformanceApiService {
  private readonly api = inject(ApiService);

  summary(): Observable<PerformanceSummary> {
    return this.api
      .get<PerformanceSummary>('/performance/summary')
      .pipe(map((res) => this.unwrap(res)));
  }

  topPerformers(limit = 5): Observable<{
    cycle: { label: string; year: number; quarter: number };
    items: PerformanceReview[];
  }> {
    return this.api
      .get<{
        cycle: { label: string; year: number; quarter: number };
        items: PerformanceReview[];
      }>('/performance/top-performers', { limit })
      .pipe(map((res) => this.unwrap(res)));
  }

  insights(): Observable<{ items: PerformanceInsight[] }> {
    return this.api
      .get<{ items: PerformanceInsight[] }>('/performance/insights')
      .pipe(map((res) => this.unwrap(res)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    return res.data;
  }
}
