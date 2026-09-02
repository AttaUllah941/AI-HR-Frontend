import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  AttendanceService,
  AttendanceSummary,
  MyTodayResponse,
} from '../../../../core/services/attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

@Component({
  selector: 'app-attendance-today-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './attendance-today-page.component.html',
  styleUrl: './attendance-today-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceTodayPageComponent implements OnInit {
  private readonly attendance = inject(AttendanceService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly summary = signal<AttendanceSummary | null>(null);
  readonly myToday = signal<MyTodayResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly clocking = signal(false);

  readonly canClock = this.auth.hasPermission('attendance:create');

  readonly clockState = computed(() => {
    const record = this.myToday()?.record;
    if (!record?.checkInAt) {
      return 'clock-in' as const;
    }
    if (!record.checkOutAt) {
      return 'clock-out' as const;
    }
    return 'completed' as const;
  });

  readonly kpis = computed(() => {
    const s = this.summary();
    if (!s) {
      return [];
    }
    return [
      { key: 'present', label: 'Present', value: s.present, icon: 'check_circle', tone: 'success' },
      { key: 'absent', label: 'Absent', value: s.absent, icon: 'cancel', tone: 'danger' },
      { key: 'late', label: 'Late', value: s.late, icon: 'schedule', tone: 'warning' },
      { key: 'onLeave', label: 'On Leave', value: s.onLeave, icon: 'beach_access', tone: 'purple' },
      { key: 'remote', label: 'Remote', value: s.remote, icon: 'home', tone: 'info' },
      {
        key: 'overtime',
        label: 'Overtime hours',
        value: s.overtimeHours,
        icon: 'more_time',
        tone: 'neutral',
      },
    ];
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      summary: this.attendance.getSummary(),
      myToday: this.attendance.getMyToday(),
    }).subscribe({
      next: ({ summary, myToday }) => {
        this.summary.set(summary);
        this.myToday.set(myToday);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Unable to load attendance for today.');
        this.loading.set(false);
      },
    });
  }

  clockIn(): void {
    if (this.clocking()) {
      return;
    }
    this.clocking.set(true);
    this.attendance.clockIn().subscribe({
      next: () => {
        this.toast.success('Clocked in');
        this.clocking.set(false);
        this.reload();
      },
      error: (err: Error) => {
        this.clocking.set(false);
        this.toast.error(err.message || 'Unable to clock in');
      },
    });
  }

  clockOut(): void {
    if (this.clocking()) {
      return;
    }
    this.clocking.set(true);
    this.attendance.clockOut().subscribe({
      next: () => {
        this.toast.success('Clocked out');
        this.clocking.set(false);
        this.reload();
      },
      error: (err: Error) => {
        this.clocking.set(false);
        this.toast.error(err.message || 'Unable to clock out');
      },
    });
  }

  formatTime(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
