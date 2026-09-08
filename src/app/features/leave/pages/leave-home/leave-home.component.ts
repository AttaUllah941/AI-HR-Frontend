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
import { LeaveApiService } from '../../services/leave-api.service';
import {
  CompanyHoliday,
  LeaveRequest,
  LeaveSummary,
  LeaveType,
} from '../../models/leave.models';

@Component({
  selector: 'app-leave-home',
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
  templateUrl: './leave-home.component.html',
  styleUrl: './leave-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveHomeComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly leaveApi = inject(LeaveApiService);
  private readonly employeesApi = inject(EmployeeService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly showRequest = signal(false);

  readonly summary = signal<LeaveSummary | null>(null);
  readonly pending = signal<LeaveRequest[]>([]);
  readonly holidays = signal<CompanyHoliday[]>([]);
  readonly employees = signal<Employee[]>([]);

  readonly canCreate = computed(() => this.auth.hasPermission('leave:create'));
  readonly canUpdate = computed(() => this.auth.hasPermission('leave:update'));

  readonly kpiCards = computed(() => {
    const s = this.summary();
    const balances = s?.balances ?? [];
    const cards = balances.map((balance) => ({
      label: balance.label,
      value: `${balance.remaining} / ${balance.allotted}`,
      tone: balance.leaveType.toLowerCase(),
    }));
    cards.push({
      label: 'Pending',
      value: `${s?.pendingCount ?? 0} requests`,
      tone: 'pending',
    });
    return cards;
  });

  readonly requestForm = this.fb.nonNullable.group({
    employeeId: ['', Validators.required],
    leaveType: ['ANNUAL' as LeaveType, Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    reason: [''],
  });

  readonly leaveTypeOptions: Array<{ value: LeaveType; label: string }> = [
    { value: 'ANNUAL', label: 'Annual' },
    { value: 'SICK', label: 'Sick' },
    { value: 'PERSONAL', label: 'Personal' },
  ];

  ngOnInit(): void {
    this.employeesApi.list({ pageSize: 50, sort: 'name' }).subscribe({
      next: (data) => this.employees.set(data.items),
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    let pending = 3;
    const done = () => {
      pending -= 1;
      if (pending <= 0) {
        this.loading.set(false);
      }
    };

    this.leaveApi.summary().subscribe({
      next: (data) => {
        this.summary.set(data);
        done();
      },
      error: () => done(),
    });

    this.leaveApi.pending(8).subscribe({
      next: (data) => {
        this.pending.set(data.items);
        done();
      },
      error: () => done(),
    });

    this.leaveApi.holidays(8).subscribe({
      next: (data) => {
        this.holidays.set(data.items);
        done();
      },
      error: () => done(),
    });
  }

  toggleRequest(): void {
    this.showRequest.update((open) => !open);
  }

  submitRequest(): void {
    if (this.requestForm.invalid || this.saving()) {
      this.requestForm.markAllAsTouched();
      return;
    }

    const raw = this.requestForm.getRawValue();
    this.saving.set(true);
    this.leaveApi
      .create({
        employeeId: raw.employeeId,
        leaveType: raw.leaveType,
        startDate: raw.startDate,
        endDate: raw.endDate,
        reason: raw.reason || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showRequest.set(false);
          this.requestForm.reset({
            employeeId: '',
            leaveType: 'ANNUAL',
            startDate: '',
            endDate: '',
            reason: '',
          });
          this.toast.success('Leave request submitted');
          this.reload();
        },
        error: () => this.saving.set(false),
      });
  }

  approve(request: LeaveRequest): void {
    if (!this.canUpdate()) {
      return;
    }
    this.leaveApi.update(request.id, { status: 'APPROVED' }).subscribe({
      next: () => {
        this.toast.success('Leave approved');
        this.reload();
      },
    });
  }

  reject(request: LeaveRequest): void {
    if (!this.canUpdate()) {
      return;
    }
    this.leaveApi.update(request.id, { status: 'REJECTED' }).subscribe({
      next: () => {
        this.toast.success('Leave rejected');
        this.reload();
      },
    });
  }

  typeLabel(type: LeaveType): string {
    return this.leaveTypeOptions.find((option) => option.value === type)?.label ?? type;
  }

  formatRange(start: string, end: string): string {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const sameDay = startDate.toISOString().slice(0, 10) === endDate.toISOString().slice(0, 10);
    const fmt = (value: Date) =>
      value.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
    return sameDay ? fmt(startDate) : `${fmt(startDate)} → ${fmt(endDate)}`;
  }

  formatHoliday(value: string): string {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: '2-digit',
      timeZone: 'UTC',
    });
  }

  monthKey(value: string): string {
    return new Date(value)
      .toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })
      .toUpperCase();
  }
}
