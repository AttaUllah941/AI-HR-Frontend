import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmployeeService } from '../../../employees/services/employee.service';
import { Employee } from '../../../employees/models/employee.models';
import { AttendanceApiService } from '../../services/attendance-api.service';
import {
  AttendanceCalendarDay,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSummary,
} from '../../models/attendance.models';

interface CalendarCell {
  day: number | null;
  date?: string;
  meta?: AttendanceCalendarDay;
  isToday?: boolean;
}

@Component({
  selector: 'app-attendance-home',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './attendance-home.component.html',
  styleUrl: './attendance-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceHomeComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly attendanceApi = inject(AttendanceApiService);
  private readonly employeesApi = inject(EmployeeService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly showCheckIn = signal(false);

  readonly summary = signal<AttendanceSummary | null>(null);
  readonly checkIns = signal<AttendanceRecord[]>([]);
  readonly calendarDays = signal<AttendanceCalendarDay[]>([]);
  readonly employees = signal<Employee[]>([]);
  readonly viewYear = signal(new Date().getFullYear());
  readonly viewMonth = signal(new Date().getMonth() + 1);

  readonly canCreate = computed(() => this.auth.hasPermission('attendance:create'));

  readonly monthLabel = computed(() => {
    const date = new Date(Date.UTC(this.viewYear(), this.viewMonth() - 1, 1));
    return date.toLocaleString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  });

  readonly calendarCells = computed(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    const first = new Date(Date.UTC(year, month - 1, 1));
    const startWeekday = first.getUTCDay(); // 0 Sun
    // Lovable calendar starts Monday
    const mondayOffset = (startWeekday + 6) % 7;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const byDate = new Map(this.calendarDays().map((day) => [day.date, day]));
    const todayIso = new Date().toISOString().slice(0, 10);

    const cells: CalendarCell[] = [];
    for (let i = 0; i < mondayOffset; i += 1) {
      cells.push({ day: null });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
      cells.push({
        day,
        date,
        meta: byDate.get(date),
        isToday: date === todayIso,
      });
    }
    return cells;
  });

  readonly kpiCards = computed(() => {
    const s = this.summary();
    return [
      { label: 'Present', value: s?.present ?? 0, tone: 'present' },
      { label: 'Late', value: s?.late ?? 0, tone: 'late' },
      { label: 'Absent', value: s?.absent ?? 0, tone: 'absent' },
      { label: 'Remote', value: s?.remote ?? 0, tone: 'remote' },
      { label: 'On Leave', value: s?.onLeave ?? 0, tone: 'leave' },
    ];
  });

  readonly checkInForm = this.fb.nonNullable.group({
    employeeId: ['', Validators.required],
    status: ['PRESENT' as AttendanceStatus, Validators.required],
    locationLabel: [''],
    checkInAt: [''],
  });

  readonly statusOptions: Array<{ value: AttendanceStatus; label: string }> = [
    { value: 'PRESENT', label: 'Present' },
    { value: 'LATE', label: 'Late' },
    { value: 'REMOTE', label: 'Remote' },
    { value: 'ABSENT', label: 'Absent' },
    { value: 'ON_LEAVE', label: 'On Leave' },
  ];

  ngOnInit(): void {
    this.employeesApi.list({ pageSize: 50, sort: 'name' }).subscribe({
      next: (data) => this.employees.set(data.items),
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    const year = this.viewYear();
    const month = this.viewMonth();

    let pending = 3;
    const done = () => {
      pending -= 1;
      if (pending <= 0) {
        this.loading.set(false);
      }
    };

    this.attendanceApi.summary().subscribe({
      next: (data) => {
        this.summary.set(data);
        done();
      },
      error: () => done(),
    });

    this.attendanceApi.checkIns(undefined, 8).subscribe({
      next: (data) => {
        this.checkIns.set(data.items);
        done();
      },
      error: () => done(),
    });

    this.attendanceApi.calendar(year, month).subscribe({
      next: (data) => {
        this.calendarDays.set(data.days);
        done();
      },
      error: () => done(),
    });
  }

  shiftMonth(delta: number): void {
    const date = new Date(Date.UTC(this.viewYear(), this.viewMonth() - 1 + delta, 1));
    this.viewYear.set(date.getUTCFullYear());
    this.viewMonth.set(date.getUTCMonth() + 1);
    this.attendanceApi.calendar(this.viewYear(), this.viewMonth()).subscribe({
      next: (data) => this.calendarDays.set(data.days),
    });
  }

  toggleCheckIn(): void {
    this.showCheckIn.update((open) => !open);
  }

  submitCheckIn(): void {
    if (this.checkInForm.invalid || this.saving()) {
      this.checkInForm.markAllAsTouched();
      return;
    }

    const raw = this.checkInForm.getRawValue();
    const now = new Date();
    const workDate = now.toISOString().slice(0, 10);
    let checkInAt: string | undefined;
    if (raw.checkInAt) {
      checkInAt = `${workDate}T${raw.checkInAt}:00.000Z`;
    } else if (raw.status === 'PRESENT' || raw.status === 'LATE' || raw.status === 'REMOTE') {
      checkInAt = now.toISOString();
    }

    this.saving.set(true);
    this.attendanceApi
      .create({
        employeeId: raw.employeeId,
        workDate,
        status: raw.status,
        locationLabel: raw.locationLabel || undefined,
        checkInAt,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showCheckIn.set(false);
          this.checkInForm.reset({
            employeeId: '',
            status: 'PRESENT',
            locationLabel: '',
            checkInAt: '',
          });
          this.toast.success('Attendance recorded');
          this.reload();
        },
        error: () => this.saving.set(false),
      });
  }

  formatCheckIn(value?: string | null): string {
    if (!value) {
      return '—';
    }
    return new Date(value).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}
