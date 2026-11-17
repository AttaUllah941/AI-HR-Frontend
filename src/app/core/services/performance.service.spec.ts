import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { ApiService } from './api.service';
import { PerformanceFeedback, PerformanceService } from './performance.service';

describe('PerformanceService.feedbackAuthorLabel', () => {
  let service: PerformanceService;

  const base: PerformanceFeedback = {
    id: 'f1',
    fromEmployeeId: 'e1',
    toEmployeeId: 'e2',
    type: 'PEER',
    rating: null,
    content: 'Great work',
    isAnonymous: false,
    reviewId: null,
    fromEmployee: { id: 'e1', firstName: 'Ada', lastName: 'Lovelace' } as never,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: {} }] });
    service = TestBed.inject(PerformanceService);
  });

  it('shows the author for named feedback', () => {
    expect(service.feedbackAuthorLabel(base)).toBe('Ada Lovelace');
  });

  it('shows Anonymous when flagged', () => {
    expect(service.feedbackAuthorLabel({ ...base, isAnonymous: true })).toBe('Anonymous');
  });

  it('shows Anonymous when the author was redacted', () => {
    expect(
      service.feedbackAuthorLabel({ ...base, fromEmployee: null, fromEmployeeId: null }),
    ).toBe('Anonymous');
    expect(service.feedbackAuthorLabel({ ...base, fromEmployee: null, fromEmployeeId: '' })).toBe(
      'Anonymous',
    );
  });
});
