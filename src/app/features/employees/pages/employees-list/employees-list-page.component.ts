import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  EmployeeListItem,
  EmployeeService,
  EmployeeStatus,
} from '../../../../core/services/employee.service';
import { Department, OrganizationService } from '../../../../core/services/organization.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { EmployeeFormDialogComponent } from '../../dialogs/employee-form-dialog.component';

const STATUS_OPTIONS: Array<{ value: EmployeeStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_LEAVE', label: 'On leave' },
  { value: 'PROBATION', label: 'Probation' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'INACTIVE', label: 'Inactive' },
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
  { bg: '#fce7f3', color: '#db2777' },
  { bg: '#f3f4f6', color: '#4b5563' },
];

@Component({
  selector: 'app-employees-list-page',
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
  templateUrl: './employees-list-page.component.html',
  styleUrl: './employees-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeesListPageComponent implements OnInit {
  private readonly employees = inject(EmployeeService);
  private readonly org = inject(OrganizationService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly items = signal<EmployeeListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly departments = signal<Department[]>([]);
  readonly filtersOpen = signal(false);
  readonly menuItem = signal<EmployeeListItem | null>(null);

  readonly canCreate = this.auth.hasPermission('employees:create');
  readonly canUpdate = this.auth.hasPermission('employees:update');
  readonly canDelete = this.auth.hasPermission('employees:delete');
  readonly canExport = this.auth.hasPermission('employees:view');

  readonly statusOptions = STATUS_OPTIONS;
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly statusControl = new FormControl<EmployeeStatus | ''>('', { nonNullable: true });
  readonly departmentControl = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.org.listDepartments().subscribe({ next: (items) => this.departments.set(items) });
    this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.page.set(1);
      this.reload();
    });
    this.statusControl.valueChanges.subscribe(() => {
      this.page.set(1);
      this.reload();
    });
    this.departmentControl.valueChanges.subscribe(() => {
      this.page.set(1);
      this.reload();
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    this.employees
      .list({
        page: this.page(),
        pageSize: 10,
        search: this.searchControl.value.trim() || undefined,
        status: this.statusControl.value || undefined,
        departmentId: this.departmentControl.value || undefined,
        sortBy: 'lastName',
        sortDir: 'asc',
      })
      .subscribe({
        next: (data) => {
          this.items.set(data.items);
          this.total.set(data.pagination.total);
          this.totalPages.set(data.pagination.totalPages);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Unable to load employees. Please try again.');
          this.loading.set(false);
        },
      });
  }

  toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  setMenuItem(item: EmployeeListItem): void {
    this.menuItem.set(item);
  }

  openForm(employee: EmployeeListItem | null = null): void {
    this.dialog
      .open(EmployeeFormDialogComponent, {
        data: { employeeId: employee?.id ?? null },
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

  view(employee: EmployeeListItem): void {
    void this.router.navigate(['/employees', employee.id]);
  }

  remove(item: EmployeeListItem): void {
    this.confirm
      .open({
        title: 'Delete employee',
        message: `Are you sure you want to delete ${item.firstName} ${item.lastName}? This action cannot be undone.`,
        confirmLabel: 'Delete employee',
        destructive: true,
        icon: 'delete_forever',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.deletingId.set(item.id);
        this.employees.delete(item.id).subscribe({
          next: () => {
            this.toast.success('Employee deleted');
            this.deletingId.set(null);
            this.reload();
          },
          error: () => {
            this.deletingId.set(null);
            this.toast.error('Unable to delete employee');
          },
        });
      });
  }

  exportCsv(): void {
    const rows = this.items();
    if (rows.length === 0) {
      this.toast.info('No employees to export');
      return;
    }

    const header = ['Name', 'Email', 'Department', 'Position', 'Manager', 'Status', 'Joined'];
    const lines = rows.map((item) =>
      [
        `${item.firstName} ${item.lastName}`,
        item.email,
        item.department?.name ?? '',
        item.designation?.name ?? '',
        this.managerName(item),
        this.statusLabel(item),
        this.formatJoined(item.joinDate),
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    );

    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'employees.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.toast.success('Employees exported');
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

  initials(item: EmployeeListItem): string {
    return `${item.firstName.charAt(0)}${item.lastName.charAt(0)}`.toUpperCase();
  }

  avatarStyle(item: EmployeeListItem): { background: string; color: string } {
    const index =
      [...item.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_COLORS.length;
    const palette = AVATAR_COLORS[index];
    return { background: palette.bg, color: palette.color };
  }

  managerName(item: EmployeeListItem): string {
    if (!item.manager) {
      return '—';
    }
    return `${item.manager.firstName} ${item.manager.lastName.charAt(0)}.`;
  }

  formatJoined(value: string | null): string {
    if (!value) {
      return '—';
    }
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  statusLabel(item: EmployeeListItem): string {
    if (item.status === 'ON_LEAVE') {
      return 'On Leave';
    }
    if (item.status === 'ACTIVE' && item.workLocation?.toLowerCase().includes('remote')) {
      return 'Remote';
    }
    if (item.status === 'ACTIVE') {
      return 'Active';
    }
    return item.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  statusClass(item: EmployeeListItem): string {
    if (item.status === 'ON_LEAVE') {
      return 'emp-status-pill emp-status-pill--leave';
    }
    if (item.status === 'ACTIVE' && item.workLocation?.toLowerCase().includes('remote')) {
      return 'emp-status-pill emp-status-pill--remote';
    }
    if (item.status === 'ACTIVE') {
      return 'emp-status-pill emp-status-pill--active';
    }
    if (item.status === 'PROBATION' || item.status === 'NOTICE_PERIOD') {
      return 'emp-status-pill emp-status-pill--leave';
    }
    return 'emp-status-pill emp-status-pill--neutral';
  }
}
