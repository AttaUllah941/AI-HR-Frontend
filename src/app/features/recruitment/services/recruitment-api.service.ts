import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse } from '../../../core/models/api.models';
import {
  Candidate,
  JobOpening,
  PipelineColumn,
  RecruitmentSummary,
} from '../models/recruitment.models';

@Injectable({ providedIn: 'root' })
export class RecruitmentApiService {
  private readonly api = inject(ApiService);

  summary(): Observable<RecruitmentSummary> {
    return this.api
      .get<RecruitmentSummary>('/recruitment/summary')
      .pipe(map((res) => this.unwrap(res)));
  }

  pipeline(): Observable<{ columns: PipelineColumn[] }> {
    return this.api
      .get<{ columns: PipelineColumn[] }>('/recruitment/pipeline')
      .pipe(map((res) => this.unwrap(res)));
  }

  listJobs(): Observable<{ items: JobOpening[] }> {
    return this.api
      .get<{ items: JobOpening[] }>('/recruitment/jobs', { pageSize: 50, status: 'OPEN' })
      .pipe(map((res) => this.unwrap(res)));
  }

  createJob(payload: Record<string, unknown>): Observable<JobOpening> {
    return this.api
      .post<JobOpening>('/recruitment/jobs', payload)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateCandidate(id: string, payload: Record<string, unknown>): Observable<Candidate> {
    return this.api
      .patch<Candidate>(`/recruitment/candidates/${id}`, payload)
      .pipe(map((res) => this.unwrap(res)));
  }

  aiScreen(): Observable<{ screened: number; items: Candidate[] }> {
    return this.api
      .post<{ screened: number; items: Candidate[] }>('/recruitment/ai-screen', {})
      .pipe(map((res) => this.unwrap(res)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    return res.data;
  }
}
