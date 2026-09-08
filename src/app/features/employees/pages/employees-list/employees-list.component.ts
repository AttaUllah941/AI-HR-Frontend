import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrganizationService } from '../../../organization/services/organization.service';
import { Department } from '../../../organization/models/organization.models';
import { EmployeeService } from '../../services/employee.service';
import { Employee, EmploymentStatus } from '../../models/employee.models';

@Component({
  selector: 'app-employees-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './employees-list.component.html',
  styleUrl: './employees-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeesListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly employeesApi = inject(EmployeeService);
  private readonly orgApi = inject(OrganizationService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly showFilters = signal(false);
  readonly showCreate = signal(false);

  readonly employees = signal<Employee[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalPages = signal(1);

  readonly search = signal('');
  readonly departmentId = signal('');
  readonly status = signal<EmploymentStatus | ''>('');

  readonly canCreate = computed(() => this.auth.hasPermission('employees:create'));
  readonly canExport = computed(() => this.auth.hasPermission('employees:view'));
  readonly canDelete = computed(() => this.auth.hasPermission('employees:delete'));

  readonly rangeLabel = computed(() => {
    if (this.total() === 0) {
      return 'Showing 0 of 0';
    }
    const start = (this.page() - 1) * this.pageSize() + 1;
    const end = Math.min(this.page() * this.pageSize(), this.total());
    return `Showing ${start}–${end} of ${this.total().toLocaleString()}`;
  });

  readonly createForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    position: [''],
    departmentId: [''],
    status: ['ACTIVE' as EmploymentStatus, Validators.required],
    hireDate: [''],
  });

  readonly statusOptions: Array<{ value: EmploymentStatus; label: string }> = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'REMOTE', label: 'Remote' },
    { value: 'ON_LEAVE', label: 'On Leave' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'TERMINATED', label: 'Terminated' },
  ];

  ngOnInit(): void {
    this.orgApi.listDepartments({ pageSize: 100 }).subscribe({
      next: (data) => this.departments.set(data.items),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.employeesApi
      .list({
        search: this.search() || undefined,
        departmentId: this.departmentId() || undefined,
        status: this.status() || undefined,
        page: this.page(),
        pageSize: this.pageSize(),
        sort: 'name',
        order: 'asc',
      })
      .subscribe({
        next: (data) => {
          this.employees.set(data.items);
          this.total.set(data.total);
          this.totalPages.set(data.totalPages);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
    this.load();
  }

  onDepartmentFilter(value: string): void {
    this.departmentId.set(value);
    this.page.set(1);
    this.load();
  }

  onStatusFilter(value: EmploymentStatus | ''): void {
    this.status.set(value);
    this.page.set(1);
    this.load();
  }

  toggleFilters(): void {
    this.showFilters.update((open) => !open);
  }

  toggleCreate(): void {
    this.showCreate.update((open) => !open);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }
    this.page.set(page);
    this.load();
  }

  createEmployee(): void {
    if (this.createForm.invalid || this.saving()) {
      this.createForm.markAllAsTouched();
      return;
    }

    const raw = this.createForm.getRawValue();
    this.saving.set(true);
    this.employeesApi
      .create({
        firstName: raw.firstName,
        lastName: raw.lastName,
        email: raw.email,
        position: raw.position || undefined,
        departmentId: raw.departmentId || undefined,
        status: raw.status,
        hireDate: raw.hireDate || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showCreate.set(false);
          this.createForm.reset({
            firstName: '',
            lastName: '',
            email: '',
            position: '',
            departmentId: '',
            status: 'ACTIVE',
            hireDate: '',
          });
          this.toast.success('Employee added');
          this.load();
        },
        error: () => this.saving.set(false),
      });
  }

  removeEmployee(employee: Employee): void {
    if (!this.canDelete()) {
      return;
    }
    this.employeesApi.remove(employee.id).subscribe({
      next: () => {
        this.toast.success('Employee removed');
        this.load();
      },
    });
  }

  exportEmployees(): void {
    this.employeesApi
      .exportCsv({
        search: this.search() || undefined,
        departmentId: this.departmentId() || undefined,
        status: this.status() || undefined,
      })
      .subscribe({
        next: (csv) => {
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = 'employees.csv';
          anchor.click();
          URL.revokeObjectURL(url);
          this.toast.success('Export downloaded');
        },
      });
  }

  initials(employee: Employee): string {
    return `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`.toUpperCase();
  }

  statusLabel(status: EmploymentStatus): string {
    return this.statusOptions.find((option) => option.value === status)?.label ?? status;
  }
}
