import type { AiGeneration } from '../../../core/services/ai.service';

export interface GenerationSubject {
  /** Who the result is about (candidate or employee). */
  name: string;
  /** What it was run against (job opening or review period), if anything. */
  detail: string;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function fullName(person: unknown): string {
  const p = record(person);
  return p ? [text(p['firstName']), text(p['lastName'])].filter(Boolean).join(' ') : '';
}

/** Candidate (and job) a resume screening was run for, read from the stored input. */
export function screeningSubject(generation: AiGeneration): GenerationSubject {
  const input = record(generation.input);
  return {
    name: fullName(input?.['candidate']) || 'Unknown candidate',
    detail: text(record(input?.['jobOpening'])?.['title']),
  };
}

/** Employee (and review period) an appraisal draft was generated for, read from the stored input. */
export function appraisalSubject(generation: AiGeneration): GenerationSubject {
  const input = record(generation.input);
  return {
    name: fullName(input?.['employee']) || 'Unknown employee',
    detail: text(input?.['periodLabel']),
  };
}

/** Plain-language status for a generation row. */
export function generationStatusLabel(status: string | null | undefined): string {
  switch ((status ?? '').toUpperCase()) {
    case 'SUCCESS':
      return 'Complete';
    case 'FAILED':
      return 'Failed';
    case 'PENDING':
      return 'Pending';
    default:
      return status || '—';
  }
}
