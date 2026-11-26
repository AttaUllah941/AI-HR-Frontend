import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { AttendanceReport, ReportsService } from '../../../../core/services/reports.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ReportsAttendancePageComponent } from './reports-attendance-page.component';

const REPORT = {
  totals: { records: 10, workMinutes: 125, overtimeMinutes: 45 },
  charts: { byStatus: [], dailyPresent: [] },
  rows: [{ status: 'PRESENT', count: 10, workMinutes: 125, overtimeMinutes: 45 }],
} as unknown as AttendanceReport;

async function setup(responses: Array<Observable<AttendanceReport>>) {
  const calls: Array<{ dateFrom: string; dateTo: string }> = [];
  TestBed.configureTestingModule({
    imports: [ReportsAttendancePageComponent],
    providers: [
      { provide: AuthService, useValue: { hasPermission: () => true } },
      { provide: ToastService, useValue: { success: () => undefined, error: () => undefined } },
      {
        provide: ReportsService,
        useValue: {
          getAttendance: (params: { dateFrom: string; dateTo: string }) => {
            calls.push(params);
            return responses[Math.min(calls.length - 1, responses.length - 1)];
          },
          formatNumber: (n: number) => String(n),
          statusLabel: (s: string) => s,
          statusTone: () => 'success',
        },
      },
    ],
  });
  // The charts sit in @defer blocks, which need their dependencies resolved first.
  await TestBed.compileComponents();
  const fixture = TestBed.createComponent(ReportsAttendancePageComponent);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement, calls };
}

// The first test compiles a large template with deferred charts, which can be slow on a busy machine.
describe('ReportsAttendancePageComponent', { timeout: 15_000 }, () => {
  it('shows work and overtime time as hours and minutes', async () => {
    const { el } = await setup([of(REPORT)]);
    expect(el.textContent).toContain('2h 5m');
    expect(el.textContent).toContain('45m');
    expect(el.textContent).not.toContain('Work minutes');
  });

  it('keeps the filters and report on screen while a new range loads', async () => {
    const pending = new Subject<AttendanceReport>();
    const { fixture, component, el, calls } = await setup([of(REPORT), pending]);
    const firstFilter = el.querySelector('app-date-field');
    expect(firstFilter).toBeTruthy();

    component.applyPreset('7d');
    fixture.detectChanges();

    expect(calls.length).toBe(2);
    expect(component.loading()).toBe(true);
    expect(el.querySelector('app-date-field')).toBe(firstFilter);
    expect(el.textContent).toContain('2h 5m');
  });

  it('builds ranges from local calendar days', async () => {
    const { component, calls } = await setup([of(REPORT)]);
    component.applyPreset('7d');
    const [first, second] = [calls[0]!, calls[1]!];
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const localToday = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    expect(first.dateTo).toBe(localToday);
    expect(second.dateTo).toBe(localToday);
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    expect(second.dateFrom).toBe(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`);
    expect(component.activePreset()).toBe('7d');
  });

  it('refuses a range that ends before it starts', async () => {
    const { fixture, component, el, calls } = await setup([of(REPORT)]);
    component.dateFrom.setValue('2026-03-10');
    component.dateTo.setValue('2026-03-01');
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('on or before');
    component.reload();
    expect(calls.length).toBe(1);
    const apply = el.querySelector<HTMLButtonElement>('.reports-filters__apply')!;
    expect(apply.disabled).toBe(true);
  });
});
