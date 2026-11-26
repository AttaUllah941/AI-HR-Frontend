import { describe, expect, it } from 'vitest';
import type { AiGeneration } from '../../../core/services/ai.service';
import { appraisalSubject, generationStatusLabel, screeningSubject } from './generation-view';

const gen = (input: unknown): AiGeneration => ({
  id: 'g1',
  feature: 'X',
  status: 'SUCCESS',
  input,
  output: null,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('screeningSubject', () => {
  it('reads the candidate and job from the stored input', () => {
    expect(
      screeningSubject(gen({ candidate: { firstName: 'Ada', lastName: 'Lovelace' }, jobOpening: { title: 'Engineer' } })),
    ).toEqual({ name: 'Ada Lovelace', detail: 'Engineer' });
  });

  it('copes with a missing job, missing names and unexpected input', () => {
    expect(screeningSubject(gen({ candidate: { firstName: 'Ada' } }))).toEqual({ name: 'Ada', detail: '' });
    expect(screeningSubject(gen({}))).toEqual({ name: 'Unknown candidate', detail: '' });
    expect(screeningSubject(gen(null))).toEqual({ name: 'Unknown candidate', detail: '' });
    expect(screeningSubject(gen('text'))).toEqual({ name: 'Unknown candidate', detail: '' });
    expect(screeningSubject(gen({ candidate: [] }))).toEqual({ name: 'Unknown candidate', detail: '' });
  });
});

describe('appraisalSubject', () => {
  it('reads the employee and period from the stored input', () => {
    expect(
      appraisalSubject(gen({ employee: { firstName: 'Grace', lastName: 'Hopper' }, periodLabel: ' H1 2026 ' })),
    ).toEqual({ name: 'Grace Hopper', detail: 'H1 2026' });
  });

  it('falls back when the employee is missing', () => {
    expect(appraisalSubject(gen({ periodLabel: null }))).toEqual({ name: 'Unknown employee', detail: '' });
  });
});

describe('generationStatusLabel', () => {
  it('uses plain words', () => {
    expect(generationStatusLabel('SUCCESS')).toBe('Complete');
    expect(generationStatusLabel('failed')).toBe('Failed');
    expect(generationStatusLabel('PENDING')).toBe('Pending');
    expect(generationStatusLabel('WEIRD')).toBe('WEIRD');
    expect(generationStatusLabel(null)).toBe('—');
  });
});
