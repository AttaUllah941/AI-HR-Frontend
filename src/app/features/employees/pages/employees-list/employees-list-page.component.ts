import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  EMPTY,
  Subscription,
  debounceTime,
  distinctUntilChanged,
  expand,
  filter,
  reduce,
  startWith,
} from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
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
import { ErrorStateComponent } from '../../../../shared/error-state/error-state.component';
import { TableSkeletonComponent } from '../../../../shared/skeleton/table-skeleton.component';
import { EmployeeFormDialogComponent } from '../../dialogs/employee-form-dialog.component';
import { downloadBlob } from '../../../../shared/utils/download-blob';
import { SavedFilters, TablePrefs } from '../../../../core/utils/table-prefs';
import { formatDate } from '../../../../core/utils/date-format';

const STATUS_OPTIONS: Array<{ value: EmployeeStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_LEAVE', label: 'On leave' },
  { value: 'PROBATION', label: 'Probation' },
  { value: 'NOTICE_PERIOD', label: 'Notice period' },
  { value: 'TERMINATED', label: 'Terminated' },
  { value: 'RESIGNED', label: 'Resigned' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'INACTIVE', label: 'Inactive' },
];

/** Eight evenly spaced hues. The same person always gets the same one; shades come from CSS so dark mode works. */
const AVATAR_HUES = [25, 70, 150, 190, 230, 265, 305, 345];

export const PAGE_SIZES = [10, 25, 50, 100] as const;

type SortKey = 'lastName' | 'employeeCode' | 'department' | 'designation' | 'status' | 'joinDate';

/** Stops spreadsheet apps from running a cell that starts with = + - @ as a formula. */
function csvCell(value: unknown): string {
  const text = String(value ?? '');
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

interface EmployeeFilterPreset {
  search: string;
  status: EmployeeStatus | '';
  departmentId: string;
}

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
    RouterLink,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './employees-list-page.component.html',
  styleUrl: './employees-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeesListPageComponent implements OnInit {
  private inflight: Subscription | null = null;
  private readonly employees = inject(EmployeeService);
  private readonly org = inject(OrganizationService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly prefs = new TablePrefs('employees');
  readonly savedFilters = new SavedFilters<EmployeeFilterPreset>('employees');
  readonly columnOptions = [
    { id: 'code', label: 'ID' },
    { id: 'department', label: 'Department' },
    { id: 'position', label: 'Position' },
    { id: 'manager', label: 'Manager' },
    { id: 'status', label: 'Status' },
    { id: 'joined', label: 'Joined' },
  ];

  readonly items = signal<EmployeeListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly pageSize = signal<number>(10);
  readonly pageSizes = PAGE_SIZES;
  readonly sortBy = signal<SortKey>('lastName');
  readonly sortDir = signal<'asc' | 'desc'>('asc');
  readonly exporting = signal(false);
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

  private readonly searchValue = toSignal(this.searchControl.valueChanges.pipe(startWith('')), { initialValue: '' });
  private readonly statusValue = toSignal(this.statusControl.valueChanges.pipe(startWith('' as EmployeeStatus | '')), {
    initialValue: '' as EmployeeStatus | '',
  });
  private readonly departmentValue = toSignal(this.departmentControl.valueChanges.pipe(startWith('')), {
    initialValue: '',
  });

  /** Removable chips for every filter that is currently narrowing the list. */
  readonly activeChips = computed(() => {
    const chips: Array<{ key: 'search' | 'status' | 'department'; label: string }> = [];
    const search = this.searchValue().trim();
    if (search) chips.push({ key: 'search', label: `Search: "${search}"` });
    const status = this.statusValue();
    if (status) {
      chips.push({ key: 'status', label: `Status: ${STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status}` });
    }
    const dept = this.departmentValue();
    if (dept) {
      chips.push({ key: 'department', label: `Department: ${this.departments().find((d) => d.id === dept)?.name ?? '…'}` });
    }
    return chips;
  });
  readonly activeFilterCount = computed(() => this.activeChips().filter((c) => c.key !== 'search').length);

  readonly rangeStart = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1));
  readonly rangeEnd = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

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

    this.inflight?.unsubscribe();
    this.inflight = this.employees
      .list(this.queryParams(this.page(), this.pageSize()))
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

  private queryParams(page: number, pageSize: number) {
    return {
      page,
      pageSize,
      search: this.searchControl.value.trim() || undefined,
      status: this.statusControl.value || undefined,
      departmentId: this.departmentControl.value || undefined,
      sortBy: this.sortBy(),
      sortDir: this.sortDir(),
    };
  }

  /** Click a header: sort by it (ascending first), click again to flip the direction. */
  sort(key: SortKey): void {
    if (this.sortBy() === key) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy.set(key);
      // Dates read best newest-first; everything else A-Z.
      this.sortDir.set(key === 'joinDate' ? 'desc' : 'asc');
    }
    this.page.set(1);
    this.reload();
  }

  sortIcon(key: SortKey): string {
    if (this.sortBy() !== key) return 'unfold_more';
    return this.sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (this.sortBy() !== key) return 'none';
    return this.sortDir() === 'asc' ? 'ascending' : 'descending';
  }

  setPageSize(value: string | number): void {
    const size = Number(value);
    if (!PAGE_SIZES.includes(size as (typeof PAGE_SIZES)[number])) return;
    this.pageSize.set(size);
    this.page.set(1);
    this.reload();
  }

  clearFilter(key: 'search' | 'status' | 'department'): void {
    if (key === 'search') this.searchControl.setValue('');
    if (key === 'status') this.statusControl.setValue('');
    if (key === 'department') this.departmentControl.setValue('');
  }

  clearAllFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.statusControl.setValue('', { emitEvent: false });
    this.departmentControl.setValue('', { emitEvent: false });
    this.page.set(1);
    this.reload();
  }

  savePreset(input: HTMLInputElement): void {
    const saved = this.savedFilters.save(input.value, {
      search: this.searchControl.value,
      status: this.statusControl.value,
      departmentId: this.departmentControl.value,
    });
    if (saved) {
      input.value = '';
      this.toast.success('Filters saved.');
    }
  }

  applyPreset(preset: EmployeeFilterPreset): void {
    // Set quietly, then reload once instead of once per control.
    this.searchControl.setValue(preset.search, { emitEvent: false });
    this.statusControl.setValue(preset.status, { emitEvent: false });
    this.departmentControl.setValue(preset.departmentId, { emitEvent: false });
    this.page.set(1);
    this.reload();
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

  /** Downloads every employee matching the current search/filters/sort (all pages), not just this page. */
  exportCsv(): void {
    if (this.exporting()) return;
    this.exporting.set(true);
    const fetchPage = (page: number) => this.employees.list(this.queryParams(page, 100));

    fetchPage(1)
      .pipe(
        expand((r) => (r.pagination.page < r.pagination.totalPages ? fetchPage(r.pagination.page + 1) : EMPTY)),
        reduce((all, r) => all.concat(r.items), [] as EmployeeListItem[]),
      )
      .subscribe({
        next: (rows) => {
          this.exporting.set(false);
          if (rows.length === 0) {
            this.toast.info('No employees to export');
            return;
          }
          const header = ['ID', 'Name', 'Email', 'Department', 'Position', 'Manager', 'Status', 'Joined'];
          const lines = rows.map((item) =>
            [
              item.employeeCode,
              `${item.firstName} ${item.lastName}`,
              item.email,
              item.department?.name ?? '',
              item.designation?.name ?? '',
              this.managerName(item),
              this.statusLabel(item),
              this.formatJoined(item.joinDate),
            ]
              .map(csvCell)
              .join(','),
          );
          const blob = new Blob([[header.map(csvCell).join(','), ...lines].join('\r\n')], {
            type: 'text/csv;charset=utf-8;',
          });
          downloadBlob(blob, 'employees.csv');
          this.toast.success(`Exported ${rows.length} employees`);
        },
        error: () => {
          this.exporting.set(false);
          this.toast.error('Unable to export employees');
        },
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

  initials(item: EmployeeListItem): string {
    return `${item.firstName.charAt(0)}${item.lastName.charAt(0)}`.toUpperCase();
  }

  /** Stable colour per person (from their employee code), one of eight hues. */
  avatarHue(item: EmployeeListItem): number {
    let hash = 0;
    for (const ch of item.employeeCode || item.id) {
      hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    }
    return AVATAR_HUES[hash % AVATAR_HUES.length]!;
  }

  managerName(item: EmployeeListItem): string {
    if (!item.manager) {
      return '—';
    }
    return `${item.manager.firstName} ${item.manager.lastName.charAt(0)}.`;
  }

  formatJoined(value: string | null): string {
    return formatDate(value);
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
