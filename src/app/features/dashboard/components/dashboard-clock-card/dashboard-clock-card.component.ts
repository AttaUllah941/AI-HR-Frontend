import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  AttendanceService,
  MyTodayResponse,
} from '../../../../core/services/attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-dashboard-clock-card',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
  ],
  templateUrl: './dashboard-clock-card.component.html',
  styleUrl: './dashboard-clock-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardClockCardComponent implements OnInit {
  private readonly attendance = inject(AttendanceService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

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
