import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';

export type GoalStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type GoalPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type ReviewCycleStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
export type ReviewStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'COMPLETED'
  | 'CANCELLED';
export type FeedbackType = 'PEER' | 'MANAGER' | 'SELF' | 'UPWARD' | 'GENERAL';
export type PromotionStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

export interface PerformanceEmployeeRef {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  department?: { id: string; name: string; code: string } | null;
  designation?: { id: string; name: string; code: string } | null;
}

export interface PerformanceGoal {
  id: string;
  employeeId: string;
  title: string;
  description: string | null;
  targetValue: number | null;
  currentValue: number;
  unit: string | null;
  progress: number;
  priority: GoalPriority;
  status: GoalStatus;
  startDate: string | null;
  dueDate: string | null;
  createdAt?: string;
  updatedAt?: string;
  employee?: PerformanceEmployeeRef;
}

export interface PerformanceKpi {
  id: string;
  name: string;
  code: string;
  description: string | null;
  unit: string | null;
  targetDefault: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeKpi {
  id: string;
  employeeId: string;
  kpiId: string;
  year: number;
  quarter: number | null;
  targetValue: number;
  actualValue: number;
  score: number | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
  employee?: PerformanceEmployeeRef;
  kpi?: PerformanceKpi | null;
}

export interface ReviewCycle {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  status: ReviewCycleStatus;
  createdAt?: string;
  updatedAt?: string;
  _count?: { reviews?: number };
  reviewCount?: number;
}

export interface PerformanceReview {
  id: string;
  cycleId: string | null;
  employeeId: string;
  reviewerId: string | null;
  status: ReviewStatus;
  selfRating: number | null;
  managerRating: number | null;
  overallRating: number | null;
  selfComments: string | null;
  managerComments: string | null;
  submittedAt: string | null;
  acknowledgedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  employee?: PerformanceEmployeeRef;
  reviewer?: PerformanceEmployeeRef | null;
  cycle?: ReviewCycle | null;
}

export interface PerformanceFeedback {
  id: string;
  fromEmployeeId: string;
  toEmployeeId: string;
  type: FeedbackType;
  rating: number | null;
  content: string;
  isAnonymous: boolean;
  reviewId: string | null;
  createdAt?: string;
  updatedAt?: string;
  fromEmployee?: PerformanceEmployeeRef | null;
  toEmployee?: PerformanceEmployeeRef | null;
}

export interface PromotionRequest {
  id: string;
  employeeId: string;
  proposedDesignationId: string | null;
  proposedTitle: string | null;
  reason: string;
  status: PromotionStatus;
  effectiveDate: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt?: string;
  updatedAt?: string;
  employee?: PerformanceEmployeeRef;
  proposedDesignation?: { id: string; name: string; code: string } | null;
}

export interface PerformanceSummary {
  scope?: 'company' | 'employee';
  year: number;
  activeGoals: number;
  completedGoals: number;
  pendingReviews: number;
  completedReviews: number;
  pendingPromotions: number;
  activeCycles: number;
  totalFeedback: number;
  avgRating: number | null;
  goalsByStatus?: Record<string, number>;
  reviewsByStatus?: Record<string, number>;
  promotionsByStatus?: Record<string, number>;
  recentGoals?: PerformanceGoal[];
  recentReviews?: PerformanceReview[];
}

export interface PerformanceMySummary {
  scope?: 'employee';
  year: number;
  employeeId: string;
  activeGoals: number;
  completedGoals: number;
  pendingReviews: number;
  avgRating: number | null;
  pendingPromotions: number;
  feedbackReceived: number;
  recentGoals?: PerformanceGoal[];
  recentReviews?: PerformanceReview[];
  recentFeedback?: PerformanceFeedback[];
}

export interface PerformanceReport {
  year: number;
  goalsByStatus: Array<{ status: GoalStatus; count: number }>;
  reviewsByStatus: Array<{ status: ReviewStatus; count: number }>;
  promotionsByStatus: Array<{ status: PromotionStatus; count: number }>;
  avgRating: number | null;
  feedbackByType?: Array<{ type: FeedbackType; count: number }>;
}

export interface GoalListParams {
  status?: GoalStatus | '';
  priority?: GoalPriority | '';
  employeeId?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedGoals {
  items: PerformanceGoal[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface KpiListParams {
  isActive?: boolean;
  search?: string;
}

export interface EmployeeKpiListParams {
  employeeId?: string;
  kpiId?: string;
  year?: number;
  quarter?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginatedEmployeeKpis {
  items: EmployeeKpi[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CycleListParams {
  status?: ReviewCycleStatus | '';
  year?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginatedCycles {
  items: ReviewCycle[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ReviewListParams {
  status?: ReviewStatus | '';
  cycleId?: string;
  employeeId?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedReviews {
  items: PerformanceReview[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface FeedbackListParams {
  type?: FeedbackType | '';
  toEmployeeId?: string;
  fromEmployeeId?: string;
  direction?: 'received' | 'given' | '';
  page?: number;
  pageSize?: number;
}

export interface PaginatedFeedback {
  items: PerformanceFeedback[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PromotionListParams {
  status?: PromotionStatus | '';
  employeeId?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedPromotions {
  items: PromotionRequest[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private readonly api = inject(ApiService);

  getSummary(year?: number): Observable<PerformanceSummary> {
    return this.api
      .get<Record<string, unknown>>('/performance/summary', { year })
      .pipe(map((res) => this.normalizeSummary(this.unwrap(res))));
  }

  getMySummary(year?: number): Observable<PerformanceMySummary> {
    return this.api
      .get<Record<string, unknown>>('/performance/me/summary', { year })
      .pipe(map((res) => this.normalizeMySummary(this.unwrap(res))));
  }

  getReport(year?: number): Observable<PerformanceReport> {
    return this.api
      .get<PerformanceReport>('/performance/report', { year })
      .pipe(map((res) => this.unwrap(res)));
  }

  listGoals(params: GoalListParams = {}): Observable<PaginatedGoals> {
    return this.api
      .get<PaginatedGoals | { items: PerformanceGoal[] }>(
        '/performance/goals',
        this.cleanParams(params),
      )
      .pipe(map((res) => this.asPaginated(this.unwrap(res))));
  }

  getGoal(id: string): Observable<PerformanceGoal> {
    return this.api
      .get<PerformanceGoal>(`/performance/goals/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  createGoal(body: Record<string, unknown>): Observable<PerformanceGoal> {
    return this.api
      .post<PerformanceGoal>('/performance/goals', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateGoal(id: string, body: Record<string, unknown>): Observable<PerformanceGoal> {
    return this.api
      .patch<PerformanceGoal>(`/performance/goals/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteGoal(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/performance/goals/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  listKpis(params: KpiListParams = {}): Observable<PerformanceKpi[]> {
    return this.api
      .get<{ items: PerformanceKpi[] } | PerformanceKpi[]>(
        '/performance/kpis',
        this.cleanParams(params),
      )
      .pipe(
        map((res) => {
          const data = this.unwrap(res);
          return Array.isArray(data) ? data : data.items;
        }),
      );
  }

  createKpi(body: Record<string, unknown>): Observable<PerformanceKpi> {
    return this.api
      .post<PerformanceKpi>('/performance/kpis', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateKpi(id: string, body: Record<string, unknown>): Observable<PerformanceKpi> {
    return this.api
      .patch<PerformanceKpi>(`/performance/kpis/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteKpi(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/performance/kpis/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  listEmployeeKpis(
    params: EmployeeKpiListParams = {},
  ): Observable<PaginatedEmployeeKpis | EmployeeKpi[]> {
    return this.api
      .get<PaginatedEmployeeKpis | { items: EmployeeKpi[] } | EmployeeKpi[]>(
        '/performance/employee-kpis',
        this.cleanParams(params),
      )
      .pipe(
        map((res) => {
          const data = this.unwrap(res);
          if (Array.isArray(data)) {
            return data;
          }
          if ('pagination' in data) {
            return data as PaginatedEmployeeKpis;
          }
          return (data as { items: EmployeeKpi[] }).items;
        }),
      );
  }

  upsertEmployeeKpi(body: Record<string, unknown>): Observable<EmployeeKpi> {
    return this.api
      .post<EmployeeKpi>('/performance/employee-kpis', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  listCycles(params: CycleListParams = {}): Observable<PaginatedCycles | ReviewCycle[]> {
    return this.api
      .get<PaginatedCycles | { items: ReviewCycle[] } | ReviewCycle[]>(
        '/performance/cycles',
        this.cleanParams(params),
      )
      .pipe(
        map((res) => {
          const data = this.unwrap(res);
          if (Array.isArray(data)) {
            return data;
          }
          if ('pagination' in data) {
            return data as PaginatedCycles;
          }
          return (data as { items: ReviewCycle[] }).items;
        }),
      );
  }

  createCycle(body: Record<string, unknown>): Observable<ReviewCycle> {
    return this.api
      .post<ReviewCycle>('/performance/cycles', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateCycle(id: string, body: Record<string, unknown>): Observable<ReviewCycle> {
    return this.api
      .patch<ReviewCycle>(`/performance/cycles/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteCycle(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/performance/cycles/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  activateCycle(id: string): Observable<ReviewCycle> {
    return this.api
      .post<ReviewCycle>(`/performance/cycles/${id}/activate`, {})
      .pipe(map((res) => this.unwrap(res)));
  }

  closeCycle(id: string): Observable<ReviewCycle> {
    return this.api
      .post<ReviewCycle>(`/performance/cycles/${id}/close`, {})
      .pipe(map((res) => this.unwrap(res)));
  }

  listReviews(params: ReviewListParams = {}): Observable<PaginatedReviews> {
    return this.api
      .get<PaginatedReviews | { items: PerformanceReview[] }>(
        '/performance/reviews',
        this.cleanParams(params),
      )
      .pipe(map((res) => this.asPaginated(this.unwrap(res))));
  }

  getReview(id: string): Observable<PerformanceReview> {
    return this.api
      .get<PerformanceReview>(`/performance/reviews/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  createReview(body: Record<string, unknown>): Observable<PerformanceReview> {
    return this.api
      .post<PerformanceReview>('/performance/reviews', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateReview(id: string, body: Record<string, unknown>): Observable<PerformanceReview> {
    return this.api
      .patch<PerformanceReview>(`/performance/reviews/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  submitReview(id: string): Observable<PerformanceReview> {
    return this.api
      .post<PerformanceReview>(`/performance/reviews/${id}/submit`, {})
      .pipe(map((res) => this.unwrap(res)));
  }

  acknowledgeReview(id: string): Observable<PerformanceReview> {
    return this.api
      .post<PerformanceReview>(`/performance/reviews/${id}/acknowledge`, {})
      .pipe(map((res) => this.unwrap(res)));
  }

  completeReview(id: string): Observable<PerformanceReview> {
    return this.api
      .post<PerformanceReview>(`/performance/reviews/${id}/complete`, {})
      .pipe(map((res) => this.unwrap(res)));
  }

  listFeedback(params: FeedbackListParams = {}): Observable<PaginatedFeedback> {
    return this.api
      .get<PaginatedFeedback | { items: PerformanceFeedback[] }>(
        '/performance/feedback',
        this.cleanParams(params),
      )
      .pipe(map((res) => this.asPaginated(this.unwrap(res))));
  }

  getFeedback(id: string): Observable<PerformanceFeedback> {
    return this.api
      .get<PerformanceFeedback>(`/performance/feedback/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  createFeedback(body: Record<string, unknown>): Observable<PerformanceFeedback> {
    return this.api
      .post<PerformanceFeedback>('/performance/feedback', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteFeedback(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/performance/feedback/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  listPromotions(params: PromotionListParams = {}): Observable<PaginatedPromotions> {
    return this.api
      .get<PaginatedPromotions | { items: PromotionRequest[] }>(
        '/performance/promotions',
        this.cleanParams(params),
      )
      .pipe(map((res) => this.asPaginated(this.unwrap(res))));
  }

  getPromotion(id: string): Observable<PromotionRequest> {
    return this.api
      .get<PromotionRequest>(`/performance/promotions/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  createPromotion(body: Record<string, unknown>): Observable<PromotionRequest> {
    return this.api
      .post<PromotionRequest>('/performance/promotions', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updatePromotion(id: string, body: Record<string, unknown>): Observable<PromotionRequest> {
    return this.api
      .patch<PromotionRequest>(`/performance/promotions/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  submitPromotion(id: string): Observable<PromotionRequest> {
    return this.api
      .post<PromotionRequest>(`/performance/promotions/${id}/submit`, {})
      .pipe(map((res) => this.unwrap(res)));
  }

  reviewPromotion(
    id: string,
    body: { approve: boolean; reviewNotes?: string | null; effectiveDate?: string | null },
  ): Observable<PromotionRequest> {
    return this.api
      .post<PromotionRequest>(`/performance/promotions/${id}/review`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  withdrawPromotion(id: string): Observable<PromotionRequest> {
    return this.api
      .post<PromotionRequest>(`/performance/promotions/${id}/withdraw`, {})
      .pipe(map((res) => this.unwrap(res)));
  }

  employeeLabel(emp?: PerformanceEmployeeRef | null): string {
    if (!emp) {
      return '—';
    }
    return `${emp.firstName} ${emp.lastName}`;
  }

  employeeSubLabel(emp?: PerformanceEmployeeRef | null): string {
    if (!emp) {
      return '';
    }
    return emp.employeeCode || emp.email || '';
  }

  statusLabel(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatRating(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }
    return value.toFixed(1);
  }

  private normalizeSummary(raw: Record<string, unknown>): PerformanceSummary {
    const num = (keys: string[], fallback = 0): number => {
      for (const key of keys) {
        const v = raw[key];
        if (typeof v === 'number' && !Number.isNaN(v)) {
          return v;
        }
      }
      return fallback;
    };
    const ratingKeys = [
      'avgRating',
      'averageRating',
      'averageOverallRating',
      'avg_rating',
      'average_rating',
    ];
    let avgRating: number | null = null;
    for (const key of ratingKeys) {
      const v = raw[key];
      if (typeof v === 'number' && !Number.isNaN(v)) {
        avgRating = v;
        break;
      }
    }

    const reviewsByStatus = (raw['reviewsByStatus'] as Record<string, number>) ?? undefined;
    const pendingFromStatus = reviewsByStatus
      ? (reviewsByStatus['DRAFT'] ?? 0) +
        (reviewsByStatus['IN_PROGRESS'] ?? 0) +
        (reviewsByStatus['SUBMITTED'] ?? 0) +
        (reviewsByStatus['ACKNOWLEDGED'] ?? 0)
      : 0;
    const completedFromStatus = reviewsByStatus?.['COMPLETED'] ?? 0;

    return {
      scope: (raw['scope'] as PerformanceSummary['scope']) ?? 'company',
      year: num(['year'], new Date().getFullYear()),
      activeGoals: num(['activeGoals', 'active_goals', 'goalsActive']),
      completedGoals: num(['completedGoals', 'completed_goals']),
      pendingReviews: num(
        ['pendingReviews', 'pending_reviews', 'reviewsPending'],
        pendingFromStatus,
      ),
      completedReviews: num(['completedReviews', 'completed_reviews'], completedFromStatus),
      pendingPromotions: num(['pendingPromotions', 'pending_promotions', 'promotionsPending']),
      activeCycles: num(['activeCycles', 'active_cycles']),
      totalFeedback: num(['totalFeedback', 'feedbackCount', 'feedback_count']),
      avgRating,
      goalsByStatus: (raw['goalsByStatus'] as Record<string, number>) ?? undefined,
      reviewsByStatus,
      promotionsByStatus: (raw['promotionsByStatus'] as Record<string, number>) ?? undefined,
      recentGoals: (raw['recentGoals'] as PerformanceGoal[]) ?? undefined,
      recentReviews: (raw['recentReviews'] as PerformanceReview[]) ?? undefined,
    };
  }

  private normalizeMySummary(raw: Record<string, unknown>): PerformanceMySummary {
    const company = this.normalizeSummary(raw);
    return {
      scope: 'employee',
      year: company.year,
      employeeId: String(raw['employeeId'] ?? raw['employee_id'] ?? ''),
      activeGoals: company.activeGoals,
      completedGoals: company.completedGoals,
      pendingReviews: company.pendingReviews,
      avgRating: company.avgRating,
      pendingPromotions: company.pendingPromotions,
      feedbackReceived:
        typeof raw['feedbackReceived'] === 'number'
          ? raw['feedbackReceived']
          : typeof raw['feedback_received'] === 'number'
            ? raw['feedback_received']
            : company.totalFeedback,
      recentGoals: company.recentGoals,
      recentReviews: company.recentReviews,
      recentFeedback: (raw['recentFeedback'] as PerformanceFeedback[]) ?? undefined,
    };
  }

  private asPaginated<T>(data: { items: T[]; pagination?: PaginatedGoals['pagination'] } | T[]): {
    items: T[];
    pagination: PaginatedGoals['pagination'];
  } {
    if (Array.isArray(data)) {
      return {
        items: data,
        pagination: {
          page: 1,
          pageSize: data.length || 20,
          total: data.length,
          totalPages: 1,
        },
      };
    }
    return {
      items: data.items ?? [],
      pagination: data.pagination ?? {
        page: 1,
        pageSize: (data.items ?? []).length || 20,
        total: (data.items ?? []).length,
        totalPages: 1,
      },
    };
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
