import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import {
  AttendanceService,
  MyTodayResponse,
} from '../../../../core/services/attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ClockDialogService } from '../../../../core/services/clock-dialog.service';
import { formatTime, formatWeekdayDate } from '../../../../core/utils/date-format';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../../shared/skeleton/skeleton.component';
import { ButtonSpinnerDirective } from '../../../../shared/button-spinner/button-spinner.directive';

@Component({
  selector: 'app-dashboard-clock-card',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    SkeletonComponent,
    EmptyStateComponent,
    ButtonSpinnerDirective,
  ],
  templateUrl: './dashboard-clock-card.component.html',
  styleUrl: './dashboard-clock-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardClockCardComponent implements OnInit {
  private readonly attendance = inject(AttendanceService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly clockDialog = inject(ClockDialogService);

  /** Emits after a successful check-in or check-out, so a parent page can refresh its own numbers. */
  readonly clocked = output<void>();

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

  ngOnInit(): void {
    if (this.canClock) {
      this.reload();
    } else {
      this.loading.set(false);
    }
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    this.attendance.getMyToday().subscribe({
      next: (data) => {
        this.myToday.set(data);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Unable to load your clock status.');
        this.loading.set(false);
      },
    });
  }

  /** Asks for confirmation (and an optional note) in a modal before recording the check-in. */
  clockIn(): void {
    if (this.clocking()) {
      return;
    }
    this.clockDialog.confirm('in').subscribe(({ note }) => {
      this.clocking.set(true);
      this.attendance.clockIn(note || undefined).subscribe({
        next: () => {
          this.toast.success('Checked in');
          this.clocking.set(false);
          this.reload();
          this.clocked.emit();
        },
        error: (err: Error) => {
          this.clocking.set(false);
          this.toast.error(err.message || 'Unable to check in');
        },
      });
    });
  }

  /** Asks for confirmation (showing time worked so far) before recording the check-out. */
  clockOut(): void {
    if (this.clocking()) {
      return;
    }
    this.clockDialog.confirm('out', this.myToday()?.record?.checkInAt).subscribe(({ note }) => {
      this.clocking.set(true);
      this.attendance.clockOut(note || undefined).subscribe({
        next: () => {
          this.toast.success('Checked out');
          this.clocking.set(false);
          this.reload();
          this.clocked.emit();
        },
        error: (err: Error) => {
          this.clocking.set(false);
          this.toast.error(err.message || 'Unable to check out');
        },
      });
    });
  }

  readonly formatTime = formatTime;
  readonly todayLabel = formatWeekdayDate(new Date());

  statusLabel(status: string | null | undefined): string {
    if (!status) {
      return 'Not started';
    }
    const text = status.replace(/_/g, ' ').toLowerCase();
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  statusTone(status: string | null | undefined): 'success' | 'warning' | 'danger' | 'neutral' {
    switch (status) {
      case 'PRESENT':
      case 'REMOTE':
        return 'success';
      case 'LATE':
      case 'HALF_DAY':
      case 'EARLY_LEAVE':
        return 'warning';
      case 'ABSENT':
        return 'danger';
      default:
        return 'neutral';
    }
  }
}
