import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';
import { EmploymentType } from './employee.service';

export type JobOpeningStatus = 'DRAFT' | 'OPEN' | 'ON_HOLD' | 'CLOSED' | 'CANCELLED';
export type ApplicationStatus =
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN';
export type InterviewType = 'PHONE' | 'VIDEO' | 'ONSITE' | 'TECHNICAL' | 'HR' | 'FINAL';
export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type OfferStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN' | 'EXPIRED';

export interface RecruitmentEmployeeRef {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  department?: { id: string; name: string; code: string } | null;
  designation?: { id: string; name: string; code: string } | null;
}

export interface RecruitmentOrgRef {
  id: string;
  name: string;
  code: string;
}

export interface JobOpening {
  id: string;
  title: string;
  code: string;
  description: string | null;
  requirements: string | null;
  employmentType: EmploymentType;
  location: string | null;
  openings: number;
  status: JobOpeningStatus;
  departmentId: string | null;
  designationId: string | null;
  branchId: string | null;
  hiringManagerId: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  department?: RecruitmentOrgRef | null;
  designation?: RecruitmentOrgRef | null;
  branch?: RecruitmentOrgRef | null;
  hiringManager?: RecruitmentEmployeeRef | null;
  _count?: { applications?: number };
  applicationCount?: number;
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  source: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  yearsExperience: number | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  resumeUrl: string | null;
  resumeFileName: string | null;
  resumeMimeType: string | null;
  screeningScore: number | null;
  screeningNotes: string | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: { applications?: number };
  applicationCount?: number;
}

export interface JobApplication {
  id: string;
  jobOpeningId: string;
  candidateId: string;
  status: ApplicationStatus;
  coverLetter: string | null;
  appliedAt: string;
  stageChangedAt: string;
  rejectionReason: string | null;
  createdAt?: string;
  updatedAt?: string;
  jobOpening?: JobOpening | null;
  candidate?: Candidate | null;
  interviews?: Interview[];
  offer?: JobOffer | null;
}

export interface Interview {
  id: string;
  applicationId: string;
  type: InterviewType;
  status: InterviewStatus;
  scheduledAt: string;
  durationMinutes: number;
  locationOrLink: string | null;
  interviewerId: string | null;
  feedback: string | null;
  rating: number | null;
  createdAt?: string;
  updatedAt?: string;
  application?: JobApplication | null;
  interviewer?: RecruitmentEmployeeRef | null;
}

export interface JobOffer {
  id: string;
  applicationId: string;
  status: OfferStatus;
  title: string;
  salary: number;
  currency: string;
  startDate: string | null;
  expiresAt: string | null;
  notes: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  application?: JobApplication | null;
}

export interface RecruitmentSummary {
  openJobs: number;
  candidates: number;
  interviewsScheduled: number;
  offersPending: number;
  totalCandidates?: number;
  scheduledInterviews?: number;
  pendingOffers?: number;
  activePipeline?: number;
  applicationsByStatus?: Record<string, number>;
  jobsByStatus?: Record<string, number>;
  interviewsByStatus?: Record<string, number>;
  offersByStatus?: Record<string, number>;
}

export interface RecruitmentReport {
  jobOpeningId?: string | null;
  jobsByStatus: Record<string, number> | Array<{ status: JobOpeningStatus; count: number }>;
  applicationsByStatus:
    | Record<string, number>
    | Array<{ status: ApplicationStatus; count: number }>;
  interviewsByStatus?:
    | Record<string, number>
    | Array<{ status: InterviewStatus; count: number }>;
  offersByStatus?: Record<string, number> | Array<{ status: OfferStatus; count: number }>;
}

export interface PipelineColumn {
  status: ApplicationStatus;
  label?: string;
  applications: JobApplication[];
}

export interface RecruitmentPipeline {
  jobOpeningId?: string | null;
  columns: PipelineColumn[];
  stages?: Record<string, JobApplication[]>;
  totals?: Record<string, number>;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface JobListParams {
  status?: JobOpeningStatus | '';
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CandidateListParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ApplicationListParams {
  jobOpeningId?: string;
  candidateId?: string;
  status?: ApplicationStatus | '';
  page?: number;
  pageSize?: number;
}

export interface InterviewListParams {
  status?: InterviewStatus | '';
  applicationId?: string;
  upcoming?: boolean;
  page?: number;
  pageSize?: number;
}

export interface OfferListParams {
  status?: OfferStatus | '';
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class RecruitmentService {
  private readonly api = inject(ApiService);

  getSummary(): Observable<RecruitmentSummary> {
    return this.api.get<RecruitmentSummary>('/recruitment/summary').pipe(
      map((res) => {
        const data = this.unwrap(res);
        return {
          ...data,
          candidates: data.candidates ?? data.totalCandidates ?? 0,
          interviewsScheduled: data.interviewsScheduled ?? data.scheduledInterviews ?? 0,
          offersPending: data.offersPending ?? data.pendingOffers ?? 0,
          openJobs: data.openJobs ?? 0,
        };
      }),
    );
  }

  getReport(): Observable<RecruitmentReport> {
    return this.api
      .get<RecruitmentReport>('/recruitment/report')
      .pipe(map((res) => this.unwrap(res)));
  }

  getPipeline(jobOpeningId?: string): Observable<RecruitmentPipeline> {
    return this.api
      .get<RecruitmentPipeline & { stages?: Record<string, JobApplication[]> }>(
        '/recruitment/pipeline',
        { jobOpeningId },
      )
      .pipe(
        map((res) => {
          const data = this.unwrap(res);
          if (data.columns?.length) {
            return data;
          }
          const stages = data.stages ?? {};
          const order: ApplicationStatus[] = [
            'APPLIED',
            'SCREENING',
            'INTERVIEW',
            'OFFER',
            'HIRED',
            'REJECTED',
            'WITHDRAWN',
          ];
          return {
            jobOpeningId: data.jobOpeningId ?? null,
            columns: order.map((status) => ({
              status,
              applications: stages[status] ?? [],
            })),
            stages,
            totals: data.totals,
          };
        }),
      );
  }

  listJobs(params: JobListParams = {}): Observable<PaginatedResult<JobOpening>> {
    return this.api
      .get<PaginatedResult<JobOpening>>(
        '/recruitment/jobs',
        params as Record<string, string | number>,
      )
      .pipe(map((res) => this.unwrap(res)));
  }

  getJob(id: string): Observable<JobOpening> {
    return this.api
      .get<JobOpening>(`/recruitment/jobs/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  createJob(body: Record<string, unknown>): Observable<JobOpening> {
    return this.api
      .post<JobOpening>('/recruitment/jobs', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateJob(id: string, body: Record<string, unknown>): Observable<JobOpening> {
    return this.api
      .patch<JobOpening>(`/recruitment/jobs/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteJob(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/recruitment/jobs/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  publishJob(id: string): Observable<JobOpening> {
    return this.api
      .post<JobOpening>(`/recruitment/jobs/${id}/publish`, {})
      .pipe(map((res) => this.unwrap(res)));
  }

  closeJob(id: string): Observable<JobOpening> {
    return this.api
      .post<JobOpening>(`/recruitment/jobs/${id}/close`, {})
      .pipe(map((res) => this.unwrap(res)));
  }

  holdJob(id: string): Observable<JobOpening> {
    return this.api
      .post<JobOpening>(`/recruitment/jobs/${id}/hold`, {})
      .pipe(map((res) => this.unwrap(res)));
  }

  listCandidates(params: CandidateListParams = {}): Observable<PaginatedResult<Candidate>> {
    return this.api
      .get<PaginatedResult<Candidate>>(
        '/recruitment/candidates',
        params as Record<string, string | number>,
      )
      .pipe(map((res) => this.unwrap(res)));
  }

  getCandidate(id: string): Observable<Candidate> {
    return this.api
      .get<Candidate>(`/recruitment/candidates/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  createCandidate(body: Record<string, unknown>): Observable<Candidate> {
    return this.api
      .post<Candidate>('/recruitment/candidates', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateCandidate(id: string, body: Record<string, unknown>): Observable<Candidate> {
    return this.api
      .patch<Candidate>(`/recruitment/candidates/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteCandidate(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/recruitment/candidates/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  attachResume(id: string, body: Record<string, unknown>): Observable<Candidate> {
    return this.api
      .post<Candidate>(`/recruitment/candidates/${id}/resume`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateScreening(id: string, body: Record<string, unknown>): Observable<Candidate> {
    return this.api
      .post<Candidate>(`/recruitment/candidates/${id}/screening`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  listApplications(
    params: ApplicationListParams = {},
  ): Observable<PaginatedResult<JobApplication>> {
    return this.api
      .get<PaginatedResult<JobApplication>>(
        '/recruitment/applications',
        params as Record<string, string | number>,
      )
      .pipe(map((res) => this.unwrap(res)));
  }

  getApplication(id: string): Observable<JobApplication> {
    return this.api
      .get<JobApplication>(`/recruitment/applications/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  createApplication(body: Record<string, unknown>): Observable<JobApplication> {
    return this.api
      .post<JobApplication>('/recruitment/applications', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateApplicationStatus(
    id: string,
    body: Record<string, unknown>,
  ): Observable<JobApplication> {
    return this.api
      .patch<JobApplication>(`/recruitment/applications/${id}/status`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  rejectApplication(id: string, body: Record<string, unknown> = {}): Observable<JobApplication> {
    return this.api
      .post<JobApplication>(`/recruitment/applications/${id}/reject`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  listInterviews(params: InterviewListParams = {}): Observable<PaginatedResult<Interview>> {
    return this.api
      .get<PaginatedResult<Interview>>(
        '/recruitment/interviews',
        params as Record<string, string | number | boolean>,
      )
      .pipe(map((res) => this.unwrap(res)));
  }

  createInterview(body: Record<string, unknown>): Observable<Interview> {
    return this.api
      .post<Interview>('/recruitment/interviews', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateInterview(id: string, body: Record<string, unknown>): Observable<Interview> {
    return this.api
      .patch<Interview>(`/recruitment/interviews/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteInterview(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/recruitment/interviews/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  completeInterview(id: string, body: Record<string, unknown>): Observable<Interview> {
    return this.api
      .post<Interview>(`/recruitment/interviews/${id}/complete`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  listOffers(params: OfferListParams = {}): Observable<PaginatedResult<JobOffer>> {
    return this.api
      .get<PaginatedResult<JobOffer>>(
        '/recruitment/offers',
        params as Record<string, string | number>,
      )
      .pipe(map((res) => this.unwrap(res)));
  }

  createOffer(body: Record<string, unknown>): Observable<JobOffer> {
    return this.api
      .post<JobOffer>('/recruitment/offers', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateOffer(id: string, body: Record<string, unknown>): Observable<JobOffer> {
    return this.api
      .patch<JobOffer>(`/recruitment/offers/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  sendOffer(id: string): Observable<JobOffer> {
    return this.api
      .post<JobOffer>(`/recruitment/offers/${id}/send`, {})
      .pipe(map((res) => this.unwrap(res)));
  }

  respondOffer(id: string, body: Record<string, unknown>): Observable<JobOffer> {
    return this.api
      .post<JobOffer>(`/recruitment/offers/${id}/respond`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  formatMoney(amount: number, currency = 'USD'): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount ?? 0);
    } catch {
      return `${currency} ${(amount ?? 0).toFixed(2)}`;
    }
  }

  statusLabel(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    return res.data;
  }
}
