import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { AiGeneration, AiService } from '../../../../core/services/ai.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AiPoliciesPageComponent } from './ai-policies-page.component';

function generation(id: string, topic: string, markdown: string, status = 'SUCCESS'): AiGeneration {
  return {
    id,
    feature: 'POLICY',
    status,
    input: { topic },
    output: { markdown, topic },
    createdAt: '2026-01-02T03:04:05.000Z',
  };
}

function setup(initial: AiGeneration[], created?: AiGeneration) {
  const listCalls: unknown[] = [];
  const deleted: string[] = [];
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { hasPermission: () => true } },
      { provide: ToastService, useValue: { success: () => undefined, error: () => undefined } },
      { provide: ConfirmDialogService, useValue: { open: () => of(true) } },
      {
        provide: AiService,
        useValue: {
          listGenerations: (params: unknown) => {
            listCalls.push(params);
            return of({
              items: initial,
              pagination: { page: 1, pageSize: 50, total: initial.length, totalPages: 1 },
            });
          },
          generatePolicy: () => of(created),
          deleteGeneration: (id: string) => {
            deleted.push(id);
            return of({ id, deleted: true });
          },
          normalizePolicyOutput: (output: { markdown?: string; topic?: string }) => ({
            markdown: output?.markdown ?? '',
            topic: output?.topic ?? null,
          }),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(AiPoliciesPageComponent);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, listCalls, deleted };
}

describe('AiPoliciesPageComponent', () => {
  it('shows the newest draft as a formatted document with a review notice', () => {
    const { el } = setup([generation('a', 'Remote work', '# Purpose\n\n- one\n- two')]);
    expect(el.querySelector('.policy-doc h3')?.textContent).toBe('Purpose');
    expect(el.querySelectorAll('.policy-doc li').length).toBe(2);
    expect(el.querySelector('.policy-notice')?.textContent).toContain('review');
  });

  it('never turns AI output into live markup', () => {
    const { el } = setup([generation('a', 'Bad', '<img src=x onerror=alert(1)>\n\n<script>alert(1)</script>')]);
    expect(el.querySelector('.policy-doc img')).toBeNull();
    expect(el.querySelector('.policy-doc script')).toBeNull();
    expect(el.querySelector('.policy-doc')?.textContent).toContain('<script>');
  });

  it('opens a draft from the history', () => {
    const { fixture, el } = setup([
      generation('a', 'First', '# One'),
      generation('b', 'Second', '# Two'),
    ]);
    const buttons = el.querySelectorAll<HTMLButtonElement>('.policy-history__item');
    buttons[1]!.click();
    fixture.detectChanges();
    expect(el.querySelector('.policy-doc h3')?.textContent).toBe('Two');
    expect(buttons[1]!.getAttribute('aria-current')).toBe('true');
    expect(buttons[0]!.getAttribute('aria-current')).toBeNull();
  });

  it('adds a generated draft to the history and selects it without reloading', () => {
    const created = generation('new', 'Dress code', '# Dress code');
    const { fixture, el, listCalls } = setup([generation('a', 'Old', '# Old')], created);
    fixture.componentInstance.form.patchValue({ topic: 'Dress code' });
    fixture.componentInstance.generate();
    fixture.detectChanges();
    expect(listCalls.length).toBe(1);
    expect(el.querySelectorAll('.policy-history__item').length).toBe(2);
    expect(el.querySelector('.policy-doc h3')?.textContent).toBe('Dress code');
  });

  it('does not call the API when the topic is missing', () => {
    const { fixture, el } = setup([]);
    fixture.componentInstance.generate();
    fixture.detectChanges();
    expect(fixture.componentInstance.generating()).toBe(false);
    expect(el.textContent).toContain('Enter the policy topic');
  });

  it('selects the next draft after deleting the open one', () => {
    const { fixture, el, deleted } = setup([
      generation('a', 'First', '# One'),
      generation('b', 'Second', '# Two'),
    ]);
    el.querySelector<HTMLButtonElement>('.policy-history__delete')!.click();
    fixture.detectChanges();
    expect(deleted).toEqual(['a']);
    expect(el.querySelectorAll('.policy-history__item').length).toBe(1);
    expect(el.querySelector('.policy-doc h3')?.textContent).toBe('Two');
  });

  it('shows a clear message for a failed draft instead of an empty document', () => {
    const { el } = setup([generation('a', 'Broken', '', 'FAILED')]);
    expect(el.querySelector('.policy-doc')).toBeNull();
    expect(el.textContent).toContain('could not be generated');
    expect(el.textContent).toContain('Failed');
  });
});
