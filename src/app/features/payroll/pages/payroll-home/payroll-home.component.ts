import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
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
import { PayrollApiService } from '../../services/payroll-api.service';
import { PayrollEntry, PayrollRun } from '../../models/payroll.models';

@Component({
  selector: 'app-payroll-home',
  standalone: true,
  imports: [
    CurrencyPipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './payroll-home.component.html',
  styleUrl: './payroll-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollHomeComponent implements OnInit {
  private readonly payrollApi = inject(PayrollApiService);
  private readonly orgApi = inject(OrganizationService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly running = signal(false);
  readonly showFilters = signal(false);

  readonly summary = signal<PayrollRun | null>(null);
  readonly entries = signal<PayrollEntry[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly totalPages = signal(1);

  readonly year = signal(new Date().getFullYear());
  readonly month = signal(new Date().getMonth() + 1);
  readonly search = signal('');
  readonly departmentId = signal('');

  readonly canExport = computed(() => this.auth.hasPermission('payroll:view'));
  readonly canRun = computed(() => this.auth.hasPermission('payroll:update'));

  readonly statusLabel = computed(() => {
    const status = this.summary()?.status;
    switch (status) {
      case 'COMPLETED':
        return 'Processed';
      case 'PROCESSING':
        return 'Processing';
      case 'DRAFT':
        return 'Draft';
      default:
        return 'Ready to process';
    }
  });

  readonly kpiCards = computed(() => {
    const s = this.summary();
    return [
      { label: 'Base Salary', value: s?.totalBase ?? 0, tone: 'base' },
      { label: 'Bonuses & Allowances', value: s?.totalBonus ?? 0, tone: 'bonus' },
      { label: 'Deductions', value: s?.totalDeductions ?? 0, tone: 'deductions' },
    ];
  });

  ngOnInit(): void {
    this.orgApi.listDepartments({ pageSize: 100 }).subscribe({
      next: (data) => this.departments.set(data.items),
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    let pending = 2;
    const done = () => {
      pending -= 1;
      if (pending <= 0) {
        this.loading.set(false);
      }
    };

    this.payrollApi.summary(this.year(), this.month()).subscribe({
      next: (data) => {
        this.summary.set(data);
        done();
      },
      error: () => done(),
    });

    this.payrollApi
      .list({
        year: this.year(),
        month: this.month(),
        search: this.search() || undefined,
        departmentId: this.departmentId() || undefined,
        page: this.page(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: (data) => {
          this.entries.set(data.items);
          this.total.set(data.total);
          this.totalPages.set(data.totalPages);
          this.summary.set(data.run);
          done();
        },
        error: () => done(),
      });
  }

  toggleFilters(): void {
    this.showFilters.update((open) => !open);
  }

  applyFilters(): void {
    this.page.set(1);
    this.reload();
  }

  clearFilters(): void {
    this.search.set('');
    this.departmentId.set('');
    this.page.set(1);
    this.reload();
  }

  shiftMonth(delta: number): void {
    const date = new Date(Date.UTC(this.year(), this.month() - 1 + delta, 1));
    this.year.set(date.getUTCFullYear());
    this.month.set(date.getUTCMonth() + 1);
    this.page.set(1);
    this.reload();
  }

  prevPage(): void {
    if (this.page() <= 1) {
      return;
    }
    this.page.update((p) => p - 1);
    this.reload();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }
    this.page.update((p) => p + 1);
    this.reload();
  }

  exportCsv(): void {
    this.payrollApi
      .exportCsv({
        year: this.year(),
        month: this.month(),
        search: this.search() || undefined,
        departmentId: this.departmentId() || undefined,
      })
      .subscribe({
        next: (csv) => {
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `payroll-${this.year()}-${String(this.month()).padStart(2, '0')}.csv`;
          anchor.click();
          URL.revokeObjectURL(url);
          this.toast.success('Payroll export downloaded');
        },
      });
  }

  runPayroll(): void {
    if (this.running()) {
      return;
    }
    this.running.set(true);
    this.payrollApi.runPayroll(this.year(), this.month()).subscribe({
      next: (data) => {
        this.running.set(false);
        this.summary.set(data);
        this.toast.success('Payroll run completed');
      },
      error: () => this.running.set(false),
    });
  }
}
