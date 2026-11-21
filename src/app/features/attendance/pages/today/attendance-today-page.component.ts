import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import {
  AttendanceService,
  AttendanceSummary,
  MyTodayResponse,
} from '../../../../core/services/attendance.service';
import { formatDateTime, formatWeekdayDate } from '../../../../core/utils/date-format';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { DashboardClockCardComponent } from '../../../dashboard/components/dashboard-clock-card/dashboard-clock-card.component';

/** "09:00" -> "09:00 AM" (shift times arrive as 24-hour HH:mm strings). */
export function to12Hour(value: string): string {
  const [h, m] = value.split(':').map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) {
    return value;
  }
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
}

function minutesOfDay(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

@Component({
  selector: 'app-attendance-today-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
    DashboardClockCardComponent,
  ],
  templateUrl: './attendance-today-page.component.html',
  styleUrl: './attendance-today-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceTodayPageComponent implements OnInit {
  private readonly attendance = inject(AttendanceService);

  readonly summary = signal<AttendanceSummary | null>(null);
  readonly myToday = signal<MyTodayResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly refreshing = signal(false);
  readonly updatedAt = signal<Date | null>(null);

  /** Ticks every minute so the shift progress stays current while the page is open. */
  private readonly now = signal(new Date());

  readonly todayLabel = computed(() => formatWeekdayDate(this.summary()?.date ?? this.now()));
  readonly updatedLabel = computed(() => {
    const at = this.updatedAt();
    return at ? `Updated ${formatDateTime(at)}` : '';
  });

  readonly kpis = computed(() => {
    const s = this.summary();
    if (!s) {
      return [];
    }
    return [
      { key: 'present', label: 'Present', value: s.present, unit: '', icon: 'check_circle', tone: 'success' },
      { key: 'late', label: 'Late', value: s.late, unit: '', icon: 'schedule', tone: 'warning' },
      { key: 'absent', label: 'Absent', value: s.absent, unit: '', icon: 'cancel', tone: 'danger' },
      { key: 'onLeave', label: 'On leave', value: s.onLeave, unit: '', icon: 'beach_access', tone: 'purple' },
      { key: 'remote', label: 'Remote', value: s.remote, unit: '', icon: 'home', tone: 'info' },
      { key: 'overtime', label: 'Overtime', value: s.overtimeHours, unit: 'h', icon: 'more_time', tone: 'neutral' },
    ];
  });

  /** Where "now" is inside today's shift: not started, in progress (with a bar) or finished. */
  readonly shiftProgress = computed(() => {
    const shift = this.myToday()?.shift;
    if (!shift) {
      return null;
    }
    const now = this.now();
    const current = now.getHours() * 60 + now.getMinutes();
    const start = minutesOfDay(shift.startTime);
    const end = minutesOfDay(shift.endTime);
    const length = Math.max(1, end - start);
    if (current < start) {
      return { state: 'upcoming' as const, percent: 0, label: `Starts in ${duration(start - current)}` };
    }
    if (current >= end) {
      return { state: 'done' as const, percent: 100, label: 'Shift finished for today' };
    }
    return {
      state: 'live' as const,
      percent: Math.round(((current - start) / length) * 100),
      label: `${duration(end - current)} left in this shift`,
    };
  });

  readonly shiftHours = computed(() => {
    const shift = this.myToday()?.shift;
    return shift ? `${to12Hour(shift.startTime)} – ${to12Hour(shift.endTime)}` : '';
  });

  constructor() {
    const timer = setInterval(() => this.now.set(new Date()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  ngOnInit(): void {
    this.reload();
  }

  /** Loads the page; a background refresh (after a check-in, or the refresh button) keeps the content on screen. */
  reload(background = false): void {
    if (background && this.summary()) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }
    this.error.set(null);

    forkJoin({
      summary: this.attendance.getSummary(),
      myToday: this.attendance.getMyToday(),
    }).subscribe({
      next: ({ summary, myToday }) => {
        this.summary.set(summary);
        this.myToday.set(myToday);
        this.updatedAt.set(new Date());
        this.loading.set(false);
        this.refreshing.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Unable to load attendance for today.');
        this.loading.set(false);
        this.refreshing.set(false);
      },
    });
  }
}
