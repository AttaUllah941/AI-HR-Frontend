export type JobOpeningStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'FILLED';
export type CandidateStage =
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED';

export interface RecruitmentSummary {
  openRoles: number;
  candidatesInFlight: number;
  stageCounts: Record<string, number>;
}

export interface JobOpening {
  id: string;
  title: string;
  locationLabel?: string | null;
  status: JobOpeningStatus;
  openingsCount: number;
  candidateCount: number;
  department?: { id: string; name: string } | null;
}

export interface Candidate {
  id: string;
  jobOpeningId: string;
  firstName: string;
  lastName: string;
  email: string;
  locationLabel?: string | null;
  stage: CandidateStage;
  score?: number | null;
  initials: string;
  jobOpening: {
    id: string;
    title: string;
    locationLabel?: string | null;
    status: JobOpeningStatus;
    department?: { id: string; name: string } | null;
  };
}

export interface PipelineColumn {
  stage: CandidateStage;
  label: string;
  count: number;
  items: Candidate[];
}
