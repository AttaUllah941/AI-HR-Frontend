import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  AttendanceRecord,
  AttendanceService,
  AttendanceStatus,
} from '../../../../core/services/attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { AttendanceRecordFormDialogComponent } from '../../dialogs/attendance-record-form-dialog.component';

const STATUS_OPTIONS: Array<{ value: AttendanceStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PRESENT', label: 'Present' },
  { value: 'LATE', label: 'Late' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'REMOTE', label: 'Remote' },
  { value: 'ON_LEAVE', label: 'On leave' },
  { value: 'HALF_DAY', label: 'Half day' },
  { value: 'HOLIDAY', label: 'Holiday' },
  { value: 'WEEKEND', label: 'Weekend' },
  { value: 'EARLY_LEAVE', label: 'Early leave' },
];

const AVATAR_COLORS = [
  { bg: '#dbeafe', color: '#2563eb' },
  { bg: '#ccfbf1', color: '#0d9488' },
  { bg: '#ffedd5', color: '#ea580c' },
  { bg: '#fee2e2', color: '#dc2626' },
  { bg: '#dcfce7', color: '#16a34a' },
  { bg: '#ede9fe', color: '#7c3aed' },
  { bg: '#fef3c7', color: '#d97706' },
  { bg: '#e0e7ff', color: '#4f46e5' },
];

@Component({
  selector: 'app-attendance-daily-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
  ],
  templateUrl: './attendance-daily-page.component.html',
  styleUrl: './attendance-daily-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceDailyPageComponent implements OnInit {
  private readonly attendance = inject(AttendanceService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<AttendanceRecord[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly filtersOpen = signal(false);
  readonly menuItem = signal<AttendanceRecord | null>(null);

  readonly canCreate = this.auth.hasPermission('attendance:create');
  readonly canUpdate = this.auth.hasPermission('attendance:update');
  readonly statusOptions = STATUS_OPTIONS;

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly statusControl = new FormControl<AttendanceStatus | ''>('', { nonNullable: true });
  readonly dateControl = new FormControl(new Date().toISOString().slice(0, 10), {
    nonNullable: true,
  });

  ngOnInit(): void {
    this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.page.set(1);
      this.reload();
    });
    this.statusControl.valueChanges.subscribe(() => {
      this.page.set(1);
      this.reload();
    });
    this.dateControl.valueChanges.subscribe(() => {
      this.page.set(1);
      this.reload();
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const date = this.dateControl.value;

    this.attendance
      .listRecords({
        page: this.page(),
        pageSize: 10,
        search: this.searchControl.value.trim() || undefined,
        status: this.statusControl.value || undefined,
        dateFrom: date || undefined,
        dateTo: date || undefined,
      })
      .subscribe({
        next: (data) => {
          this.items.set(data.items);
          this.total.set(data.pagination.total);
          this.totalPages.set(data.pagination.totalPages);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Unable to load attendance records. Please try again.');
          this.loading.set(false);
        },
      });
  }

  toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  setMenuItem(item: AttendanceRecord): void {
    this.menuItem.set(item);
  }

  openForm(record: AttendanceRecord | null = null, viewOnly = false): void {
    this.dialog
      .open(AttendanceRecordFormDialogComponent, {
        data: {
          record,
          viewOnly,
          defaultDate: this.dateControl.value,
        },
        width: '640px',
        maxHeight: '90vh',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.reload();
        }
      });
  }

  remove(item: AttendanceRecord): void {
    const name = item.employee
      ? `${item.employee.firstName} ${item.employee.lastName}`
      : 'this record';
    this.confirm
      .open({
        title: 'Delete attendance',
        message: `Are you sure you want to delete attendance for ${name}? This action cannot be undone.`,
        confirmLabel: 'Delete record',
        destructive: true,
        icon: 'delete_forever',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.deletingId.set(item.id);
        this.attendance.deleteRecord(item.id).subscribe({
          next: () => {
            this.toast.success('Attendance deleted');
            this.deletingId.set(null);
            this.reload();
          },
          error: () => {
            this.deletingId.set(null);
            this.toast.error('Unable to delete attendance');
          },
        });
      });
  }

  prevPage(): void {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.reload();
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.page.update((p) => p + 1);
      this.reload();
    }
  }

  initials(item: AttendanceRecord): string {
    const emp = item.employee;
    if (!emp) {
      return '?';
    }
    return `${emp.firstName.charAt(0)}${emp.lastName.charAt(0)}`.toUpperCase();
  }

  avatarStyle(item: AttendanceRecord): { background: string; color: string } {
    const seed = item.employeeId || item.id;
    const index = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_COLORS.length;
    const palette = AVATAR_COLORS[index];
    return { background: palette.bg, color: palette.color };
  }

  formatTime(value: string | null): string {
    if (!value) {
      return '—';
    }
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatHours(minutes: number): string {
    return `${Math.round((minutes / 60) * 10) / 10}h`;
  }

  formatLate(minutes: number): string {
    if (!minutes) {
      return '—';
    }
    return `${minutes}m`;
  }

  statusLabel(status: AttendanceStatus): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  statusClass(status: AttendanceStatus): string {
    const map: Record<string, string> = {
      PRESENT: 'att-status-pill att-status-pill--present',
      LATE: 'att-status-pill att-status-pill--late',
      ABSENT: 'att-status-pill att-status-pill--absent',
      REMOTE: 'att-status-pill att-status-pill--remote',
      ON_LEAVE: 'att-status-pill att-status-pill--leave',
    };
    return map[status] ?? 'att-status-pill att-status-pill--neutral';
  }
}
