import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  AttendanceRecord,
  AttendanceService,
  TimesheetResponse,
} from '../../../../core/services/attendance.service';
import { EmployeeListItem, EmployeeService } from '../../../../core/services/employee.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../../../shared/skeleton/table-skeleton.component';
import { ErrorStateComponent } from '../../../../shared/error-state/error-state.component';
import { DateFieldComponent } from '../../../../shared/components/date-field/date-field.component';
import { Subscription } from 'rxjs';
import { formatTime, formatWeekdayDate, toIsoDate } from '../../../../core/utils/date-format';

function monthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 10);
}

function today(): string {
  return toIsoDate(new Date());
}

@Component({
  selector: 'app-attendance-timesheet-page',
  standalone: true,
  imports: [
    DateFieldComponent,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    EmptyStateComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
  ],
  templateUrl: './attendance-timesheet-page.component.html',
  styleUrl: './attendance-timesheet-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceTimesheetPageComponent implements OnInit {
  private inflight: Subscription | null = null;
  private readonly attendance = inject(AttendanceService);
  private readonly employeesApi = inject(EmployeeService);

  readonly employees = signal<EmployeeListItem[]>([]);
  readonly timesheet = signal<TimesheetResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly loaded = signal(false);

  readonly employeeControl = new FormControl('', { nonNullable: true });
  readonly dateFromControl = new FormControl(monthStart(), { nonNullable: true });
  readonly dateToControl = new FormControl(today(), { nonNullable: true });

  ngOnInit(): void {
    this.employeesApi.list({ page: 1, pageSize: 100, sortBy: 'lastName', sortDir: 'asc' }).subscribe({
      next: (data) => {
        this.employees.set(data.items);
        if (data.items[0] && !this.employeeControl.value) {
          this.employeeControl.setValue(data.items[0].id);
        }
      },
    });
  }

  load(): void {
    if (!this.employeeControl.value) {
      this.error.set('Select an employee to load the timesheet.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.inflight?.unsubscribe();
    this.inflight = this.attendance
      .getTimesheet({
        employeeId: this.employeeControl.value,
        dateFrom: this.dateFromControl.value,
        dateTo: this.dateToControl.value,
      })
      .subscribe({
        next: (data) => {
          this.timesheet.set(data);
          this.loaded.set(true);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Unable to load timesheet.');
          this.loading.set(false);
        },
      });
  }

  formatDate(value: string): string {
    return formatWeekdayDate(value);
  }

  formatHours(minutes: number): string {
    return `${Math.round((minutes / 60) * 10) / 10}h`;
  }

  readonly formatTime = formatTime;

  statusLabel(item: AttendanceRecord): string {
    return item.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
