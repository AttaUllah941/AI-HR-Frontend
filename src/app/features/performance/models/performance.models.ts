export interface PerformanceCycleInfo {
  id: string;
  label: string;
  year: number;
  quarter: number;
  status?: string;
}

export interface PerformanceSummary {
  cycle: PerformanceCycleInfo;
  avgScore: number;
  avgScoreDelta: number;
  goalsOnTrackPercent: number;
  goalsOnTrackDelta: number;
  promotionReadyCount: number;
  reviewCount: number;
}

export interface PerformanceReview {
  id: string;
  score: number;
  goalCount: number;
  goalsCompletePercent: number;
  promotionReady: boolean;
  summary?: string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    position?: string | null;
    initials: string;
    department?: { id: string; name: string } | null;
  };
}

export interface PerformanceInsight {
  id: string;
  body: string;
  sortOrder: number;
}
