import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';

export type AiFeature =
  | 'RESUME_SCREENING'
  | 'APPRAISAL'
  | 'HR_ASSISTANT'
  | 'POLICY'
  | 'INSIGHTS'
  | 'RECOMMENDATIONS';

export type AiRequestStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type AiMessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';
export type AiInsightSeverity = 'info' | 'warning' | 'success' | 'error' | string;
export type AiRecommendationImpact = 'high' | 'medium' | 'low' | string;
export type AiPolicyTone = 'formal' | 'friendly' | 'strict';

export interface AiStatus {
  provider: string;
  model: string | null;
  features: string[];
}

export interface AiUsageByFeature {
  feature: AiFeature | string;
  count: number;
}

export interface AiSummary {
  totalRequests: number;
  successCount: number;
  failedCount: number;
  conversations: number;
  generations: number;
  usageByFeature: AiUsageByFeature[];
  recentInsights: AiInsight[];
  recentGenerations: AiGeneration[];
}

export interface AiInsight {
  id?: string;
  title: string;
  detail: string;
  severity: AiInsightSeverity;
  focus?: string;
  createdAt?: string;
}

export interface AiRecommendation {
  id?: string;
  area: string;
  action: string;
  impact: AiRecommendationImpact;
  createdAt?: string;
}

export interface AiMessage {
  id: string;
  conversationId: string;
  role: AiMessageRole;
  content: string;
  createdAt: string;
}

export interface AiConversation {
  id: string;
  companyId?: string;
  userId?: string;
  title: string | null;
  createdAt: string;
  updatedAt?: string;
  messages?: AiMessage[];
  messageCount?: number;
  _count?: { messages?: number };
}

export interface AiChatResult {
  conversation: AiConversation;
  messages: AiMessage[];
  assistantMessage?: AiMessage | null;
}

export interface AiGeneration {
  id: string;
  companyId?: string;
  userId?: string | null;
  feature: AiFeature | string;
  status: AiRequestStatus | string;
  input: Record<string, unknown> | unknown;
  output: unknown;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  provider?: string | null;
  model?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ScreeningScorecard {
  score: number | null;
  recommendation: string | null;
  strengths: string[];
  gaps: string[];
  summary: string | null;
  rawText: string | null;
}

export interface AppraisalDraft {
  overallRating: number | null;
  narrative: string | null;
  strengths: string[];
  developmentAreas: string[];
  recommendedGoals: string[];
  rawText: string | null;
}

export interface PolicyDraft {
  markdown: string;
  topic: string | null;
}

export interface AssistantChatInput {
  conversationId?: string | null;
  message: string;
  title?: string | null;
}

export interface ResumeScreeningInput {
  candidateId: string;
  jobOpeningId?: string | null;
  notes?: string | null;
}

export interface AppraisalInput {
  employeeId: string;
  reviewId?: string | null;
  periodLabel?: string | null;
}

export interface PolicyGenerateInput {
  topic: string;
  audience?: string | null;
  tone?: AiPolicyTone;
  additionalContext?: string | null;
}

export interface InsightsQuery {
  focus?: 'workforce' | 'attendance' | 'leave' | 'recruitment' | 'performance' | 'payroll';
}

export interface RecommendationsQuery {
  limit?: number;
}

export interface GenerationListParams {
  feature?: AiFeature | string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedGenerations {
  items: AiGeneration[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly api = inject(ApiService);

  getStatus(): Observable<AiStatus> {
    return this.api.get<Record<string, unknown>>('/ai/status').pipe(
      map((res) => {
        const raw = this.unwrap(res);
        return {
          provider: String(raw['provider'] ?? 'mock'),
          model:
            raw['model'] === null || raw['model'] === undefined
              ? null
              : String(raw['model']),
          features: Array.isArray(raw['features'])
            ? raw['features'].map((f) => String(f))
            : [],
        };
      }),
    );
  }

  getSummary(): Observable<AiSummary> {
    return this.api
      .get<Record<string, unknown>>('/ai/summary')
      .pipe(map((res) => this.normalizeSummary(this.unwrap(res))));
  }

  getInsights(params: InsightsQuery = {}): Observable<AiInsight[]> {
    return this.api
      .get<unknown>('/ai/insights', this.cleanParams(params))
      .pipe(map((res) => this.normalizeInsights(this.unwrap(res))));
  }

  refreshInsights(body: InsightsQuery = {}): Observable<AiInsight[]> {
    return this.api
      .post<unknown>('/ai/insights', body)
      .pipe(map((res) => this.normalizeInsights(this.unwrap(res))));
  }

  getRecommendations(params: RecommendationsQuery = {}): Observable<AiRecommendation[]> {
    return this.api
      .get<unknown>('/ai/recommendations', this.cleanParams(params))
      .pipe(map((res) => this.normalizeRecommendations(this.unwrap(res))));
  }

  refreshRecommendations(body: RecommendationsQuery = {}): Observable<AiRecommendation[]> {
    return this.api
      .post<unknown>('/ai/recommendations', body)
      .pipe(map((res) => this.normalizeRecommendations(this.unwrap(res))));
  }

  listConversations(): Observable<AiConversation[]> {
    return this.api.get<unknown>('/ai/conversations').pipe(
      map((res) => {
        const data = this.unwrap(res);
        if (Array.isArray(data)) {
          return data as AiConversation[];
        }
        if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
          return (data as { items: AiConversation[] }).items;
        }
        return [];
      }),
    );
  }

  getConversation(id: string): Observable<AiConversation> {
    return this.api
      .get<AiConversation>(`/ai/conversations/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteConversation(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/ai/conversations/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  chat(body: AssistantChatInput): Observable<AiChatResult> {
    return this.api.post<unknown>('/ai/assistant/chat', body).pipe(
      map((res) => {
        const data = this.unwrap(res) as Record<string, unknown>;
        const conversation = (data['conversation'] ?? data) as AiConversation;
        let messages: AiMessage[] = [];
        if (Array.isArray(data['messages'])) {
          messages = data['messages'] as AiMessage[];
        } else if (Array.isArray(conversation.messages)) {
          messages = conversation.messages;
        }
        const assistantMessage =
          (data['assistantMessage'] as AiMessage | null | undefined) ??
          [...messages].reverse().find((m) => m.role === 'ASSISTANT') ??
          null;
        return {
          conversation: { ...conversation, messages },
          messages,
          assistantMessage,
        };
      }),
    );
  }

  screenResume(body: ResumeScreeningInput): Observable<AiGeneration> {
    return this.api.post<unknown>('/ai/resume-screening', body).pipe(
      map((res) => this.unwrapGeneration(this.unwrap(res))),
    );
  }

  generateAppraisal(body: AppraisalInput): Observable<AiGeneration> {
    return this.api.post<unknown>('/ai/appraisals', body).pipe(
      map((res) => this.unwrapGeneration(this.unwrap(res))),
    );
  }

  generatePolicy(body: PolicyGenerateInput): Observable<AiGeneration> {
    return this.api.post<unknown>('/ai/policies', body).pipe(
      map((res) => this.unwrapGeneration(this.unwrap(res))),
    );
  }

  listGenerations(params: GenerationListParams = {}): Observable<PaginatedGenerations> {
    return this.api
      .get<PaginatedGenerations | { items: AiGeneration[] } | AiGeneration[]>(
        '/ai/generations',
        this.cleanParams(params),
      )
      .pipe(map((res) => this.asPaginated(this.unwrap(res))));
  }

  getGeneration(id: string): Observable<AiGeneration> {
    return this.api
      .get<AiGeneration>(`/ai/generations/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteGeneration(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/ai/generations/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  normalizeScreeningOutput(output: unknown): ScreeningScorecard {
    const obj = this.asRecord(output);
    if (!obj) {
      return {
        score: null,
        recommendation: null,
        strengths: [],
        gaps: [],
        summary: typeof output === 'string' ? output : null,
        rawText: typeof output === 'string' ? output : null,
      };
    }

    const nested = this.asRecord(obj['scorecard'] ?? obj['result'] ?? obj['data']) ?? obj;
    const scoreRaw = nested['score'] ?? nested['screeningScore'] ?? nested['overallScore'];
    const score =
      typeof scoreRaw === 'number'
        ? scoreRaw
        : typeof scoreRaw === 'string' && scoreRaw.trim() !== '' && !Number.isNaN(Number(scoreRaw))
          ? Number(scoreRaw)
          : null;

    return {
      score,
      recommendation: this.asNullableString(
        nested['recommendation'] ?? nested['verdict'] ?? nested['decision'],
      ),
      strengths: this.asStringList(nested['strengths'] ?? nested['pros']),
      gaps: this.asStringList(nested['gaps'] ?? nested['weaknesses'] ?? nested['risks']),
      summary: this.asNullableString(nested['summary'] ?? nested['overview'] ?? nested['text']),
      rawText: this.asNullableString(obj['text'] ?? nested['text']),
    };
  }

  normalizeAppraisalOutput(output: unknown): AppraisalDraft {
    const obj = this.asRecord(output);
    if (!obj) {
      const text = typeof output === 'string' ? output : null;
      return {
        overallRating: null,
        narrative: text,
        strengths: [],
        developmentAreas: [],
        recommendedGoals: [],
        rawText: text,
      };
    }

    const nested = this.asRecord(obj['appraisal'] ?? obj['result'] ?? obj['data']) ?? obj;
    const ratingRaw = nested['overallRating'] ?? nested['rating'] ?? nested['score'];
    const overallRating =
      typeof ratingRaw === 'number'
        ? ratingRaw
        : typeof ratingRaw === 'string' && ratingRaw.trim() !== '' && !Number.isNaN(Number(ratingRaw))
          ? Number(ratingRaw)
          : null;

    return {
      overallRating,
      narrative: this.asNullableString(
        nested['narrative'] ?? nested['summary'] ?? nested['text'] ?? obj['text'],
      ),
      strengths: this.asStringList(nested['strengths']),
      developmentAreas: this.asStringList(
        nested['developmentAreas'] ?? nested['areasForDevelopment'] ?? nested['improvements'],
      ),
      recommendedGoals: this.asStringList(
        nested['recommendedGoals'] ?? nested['goals'] ?? nested['nextGoals'],
      ),
      rawText: this.asNullableString(obj['text'] ?? nested['text']),
    };
  }

  normalizePolicyOutput(output: unknown): PolicyDraft {
    if (typeof output === 'string') {
      return { markdown: output, topic: null };
    }
    const obj = this.asRecord(output);
    if (!obj) {
      return { markdown: '', topic: null };
    }
    const markdown =
      this.asNullableString(
        obj['markdown'] ?? obj['content'] ?? obj['policy'] ?? obj['text'] ?? obj['body'],
      ) ?? '';
    return {
      markdown,
      topic: this.asNullableString(obj['topic'] ?? obj['title']),
    };
  }

  providerLabel(provider: string | null | undefined): string {
    const p = (provider ?? 'mock').toLowerCase();
    if (p === 'openai') {
      return 'OpenAI';
    }
    if (p === 'mock') {
      return 'Mock (Nova)';
    }
    return provider ?? 'Unknown';
  }

  featureLabel(feature: string | null | undefined): string {
    switch ((feature ?? '').toUpperCase()) {
      case 'RESUME_SCREENING':
        return 'Resume screening';
      case 'APPRAISAL':
        return 'Appraisal';
      case 'HR_ASSISTANT':
        return 'Assistant';
      case 'POLICY':
        return 'Policy';
      case 'INSIGHTS':
        return 'Insights';
      case 'RECOMMENDATIONS':
        return 'Recommendations';
      default:
        return feature || '—';
    }
  }

  severityClass(severity: string | null | undefined): string {
    const s = (severity ?? 'info').toLowerCase();
    if (s === 'warning' || s === 'warn') {
      return 'warning';
    }
    if (s === 'error' || s === 'danger' || s === 'high' || s === 'critical') {
      return 'error';
    }
    if (s === 'success' || s === 'ok') {
      return 'success';
    }
    return 'info';
  }

  impactClass(impact: string | null | undefined): string {
    const s = (impact ?? 'medium').toLowerCase();
    if (s === 'high') {
      return 'high';
    }
    if (s === 'low') {
      return 'low';
    }
    return 'medium';
  }

  private normalizeSummary(raw: Record<string, unknown>): AiSummary {
    const num = (keys: string[]): number => {
      for (const key of keys) {
        const v = raw[key];
        if (typeof v === 'number') {
          return v;
        }
      }
      return 0;
    };

    let usageByFeature: AiUsageByFeature[] = [];
    const usageRaw = raw['usageByFeature'] ?? raw['byFeature'] ?? raw['usage'];
    if (Array.isArray(usageRaw)) {
      usageByFeature = usageRaw.map((row) => {
        const r = (row ?? {}) as Record<string, unknown>;
        return {
          feature: String(r['feature'] ?? r['name'] ?? 'UNKNOWN'),
          count: typeof r['count'] === 'number' ? r['count'] : Number(r['total'] ?? 0) || 0,
        };
      });
    } else if (usageRaw && typeof usageRaw === 'object') {
      usageByFeature = Object.entries(usageRaw as Record<string, unknown>).map(
        ([feature, count]) => ({
          feature,
          count: typeof count === 'number' ? count : Number(count) || 0,
        }),
      );
    }

    const usageByStatus = this.asRecord(raw['usageByStatus'] ?? raw['byStatus']);
    const statusSuccess =
      typeof usageByStatus?.['SUCCESS'] === 'number' ? (usageByStatus['SUCCESS'] as number) : 0;
    const statusFailed =
      typeof usageByStatus?.['FAILED'] === 'number' ? (usageByStatus['FAILED'] as number) : 0;
    const statusPending =
      typeof usageByStatus?.['PENDING'] === 'number' ? (usageByStatus['PENDING'] as number) : 0;
    const derivedTotal = statusSuccess + statusFailed + statusPending;

    const totalFromUsage = usageByFeature.reduce((sum, row) => sum + row.count, 0);

    return {
      totalRequests:
        num(['totalRequests', 'total', 'requests']) || derivedTotal || totalFromUsage,
      successCount: num(['successCount', 'success', 'succeeded']) || statusSuccess,
      failedCount: num(['failedCount', 'failed', 'failures']) || statusFailed,
      conversations: num(['conversations', 'conversationCount']),
      generations: num(['generations', 'generationCount']) || (Array.isArray(raw['recentGenerations'])
        ? (raw['recentGenerations'] as unknown[]).length
        : 0),
      usageByFeature,
      recentInsights: this.normalizeInsights(
        raw['recentInsights'] ?? raw['insights'] ?? [],
      ),
      recentGenerations: Array.isArray(raw['recentGenerations'])
        ? (raw['recentGenerations'] as AiGeneration[])
        : Array.isArray(raw['generationsList'])
          ? (raw['generationsList'] as AiGeneration[])
          : [],
    };
  }

  private normalizeInsights(data: unknown): AiInsight[] {
    let list: unknown[] = [];
    if (Array.isArray(data)) {
      list = data;
    } else if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj['insights'])) {
        list = obj['insights'];
      } else if (obj['insights'] && typeof obj['insights'] === 'object') {
        return this.normalizeInsights(obj['insights']);
      } else if (Array.isArray(obj['items'])) {
        list = obj['items'];
      } else if (obj['output']) {
        return this.normalizeInsights(obj['output']);
      } else if (obj['generation']) {
        const generation = this.asRecord(obj['generation']);
        if (generation?.['output']) {
          return this.normalizeInsights(generation['output']);
        }
      }
    }

    return list.map((row, index) => {
      if (typeof row === 'string') {
        return { title: `Insight ${index + 1}`, detail: row, severity: 'info' };
      }
      const r = (row ?? {}) as Record<string, unknown>;
      return {
        id: r['id'] !== undefined ? String(r['id']) : undefined,
        title: String(r['title'] ?? r['name'] ?? `Insight ${index + 1}`),
        detail: String(r['detail'] ?? r['description'] ?? r['summary'] ?? r['text'] ?? ''),
        severity: String(r['severity'] ?? r['level'] ?? 'info'),
        focus: r['focus'] !== undefined ? String(r['focus']) : undefined,
        createdAt: r['createdAt'] !== undefined ? String(r['createdAt']) : undefined,
      };
    });
  }

  private normalizeRecommendations(data: unknown): AiRecommendation[] {
    let list: unknown[] = [];
    if (Array.isArray(data)) {
      list = data;
    } else if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj['recommendations'])) {
        list = obj['recommendations'];
      } else if (obj['recommendations'] && typeof obj['recommendations'] === 'object') {
        return this.normalizeRecommendations(obj['recommendations']);
      } else if (Array.isArray(obj['items'])) {
        list = obj['items'];
      } else if (obj['output']) {
        return this.normalizeRecommendations(obj['output']);
      } else if (obj['generation']) {
        const generation = this.asRecord(obj['generation']);
        if (generation?.['output']) {
          return this.normalizeRecommendations(generation['output']);
        }
      }
    }

    return list.map((row, index) => {
      if (typeof row === 'string') {
        return { area: 'General', action: row, impact: 'medium' };
      }
      const r = (row ?? {}) as Record<string, unknown>;
      return {
        id: r['id'] !== undefined ? String(r['id']) : undefined,
        area: String(r['area'] ?? r['category'] ?? r['module'] ?? 'General'),
        action: String(r['action'] ?? r['recommendation'] ?? r['text'] ?? r['detail'] ?? ''),
        impact: String(r['impact'] ?? r['priority'] ?? 'medium'),
        createdAt: r['createdAt'] !== undefined ? String(r['createdAt']) : undefined,
      };
    });
  }

  private unwrapGeneration(data: unknown): AiGeneration {
    const obj = this.asRecord(data);
    if (!obj) {
      throw new Error('Invalid AI generation response');
    }
    const nested = this.asRecord(obj['generation']);
    if (nested && typeof nested['id'] === 'string') {
      return nested as unknown as AiGeneration;
    }
    if (typeof obj['id'] === 'string') {
      return obj as unknown as AiGeneration;
    }
    throw new Error('AI generation payload missing id');
  }

  private asPaginated(
    data: PaginatedGenerations | { items: AiGeneration[]; meta?: PaginatedGenerations['pagination'] } | AiGeneration[],
  ): PaginatedGenerations {
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
    const pagination =
      ('pagination' in data && data.pagination) ||
      ('meta' in data && (data as { meta?: PaginatedGenerations['pagination'] }).meta) ||
      null;
    return {
      items: data.items ?? [],
      pagination: pagination ?? {
        page: 1,
        pageSize: (data.items ?? []).length || 20,
        total: (data.items ?? []).length,
        totalPages: 1,
      },
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private asStringList(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        if (item && typeof item === 'object') {
          const r = item as Record<string, unknown>;
          return String(r['text'] ?? r['title'] ?? r['label'] ?? '');
        }
        return String(item ?? '');
      })
      .filter((s) => s.trim().length > 0);
  }

  private asNullableString(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const s = String(value).trim();
    return s.length ? s : null;
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
