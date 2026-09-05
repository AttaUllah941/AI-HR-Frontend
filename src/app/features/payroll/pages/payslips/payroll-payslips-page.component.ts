import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  PaginatedPayslips,
  Payslip,
  PayslipStatus,
  PayrollService,
} from '../../../../core/services/payroll.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { PayslipDetailDialogComponent } from '../../dialogs/payslip-detail-dialog.component';

const STATUS_OPTIONS: Array<{ value: PayslipStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'GENERATED', label: 'Generated' },
  { value: 'PAID', label: 'Paid' },
  { value: 'VOID', label: 'Void' },
];

@Component({
  selector: 'app-payroll-payslips-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
    OrganizationSectionHeaderComponent,
  ],
  templateUrl: './payroll-payslips-page.component.html',
  styleUrl: './payroll-payslips-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollPayslipsPageComponent implements OnInit {
  private readonly payroll = inject(PayrollService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  readonly currentYear = new Date().getFullYear();
  readonly yearOptions = [this.currentYear - 1, this.currentYear, this.currentYear + 1];

  readonly items = signal<Payslip[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly pageSize = 20;
  readonly isMineOnly = signal(false);

  readonly canManage =
    this.auth.hasPermission('payroll:create') ||
    this.auth.hasPermission('payroll:update') ||
    this.auth.hasPermission('payroll:approve');

  sectionDescription(): string {
    return this.isMineOnly()
      ? 'Your generated payslips for the selected year.'
      : 'Company payslips generated from payroll runs.';
  }

  readonly statusOptions = STATUS_OPTIONS;
  readonly statusControl = new FormControl<PayslipStatus | ''>('', { nonNullable: true });
  readonly yearControl = new FormControl(this.currentYear, { nonNullable: true });

  ngOnInit(): void {
    this.statusControl.valueChanges.subscribe(() => {
      this.page.set(1);
      this.reload();
    });
    this.yearControl.valueChanges.subscribe(() => {
      this.page.set(1);
      this.reload();
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const params = {
      year: this.yearControl.value,
      status: this.statusControl.value || undefined,
      page: this.page(),
      pageSize: this.pageSize,
    };

    const applyResult = (res: PaginatedPayslips | Payslip[]) => {
      if (Array.isArray(res)) {
        this.items.set(res);
        this.total.set(res.length);
        this.totalPages.set(1);
      } else {
        this.items.set(res.items);
        this.total.set(res.pagination.total);
        this.totalPages.set(res.pagination.totalPages);
      }
      this.loading.set(false);
    };

    if (this.canManage) {
      this.isMineOnly.set(false);
      this.payroll.listPayslips(params).subscribe({
        next: applyResult,
        error: () => {
          this.isMineOnly.set(true);
          this.payroll.getMyPayslips(params).subscribe({
            next: applyResult,
            error: () => {
              this.error.set('Unable to load payslips. Please try again.');
              this.loading.set(false);
            },
          });
        },
      });
      return;
    }

    this.isMineOnly.set(true);
    this.payroll.getMyPayslips(params).subscribe({
      next: applyResult,
      error: () => {
        this.error.set('Unable to load payslips. Please try again.');
        this.loading.set(false);
      },
    });
  }

  openDetail(item: Payslip): void {
    this.dialog.open(PayslipDetailDialogComponent, {
      data: { payslip: item },
      width: '560px',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });
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

  formatMoney(amount: number, currency: string): string {
    return this.payroll.formatMoney(amount, currency);
  }

  monthLabel(month: number): string {
    return this.payroll.monthLabel(month);
  }

  statusClass(status: PayslipStatus): string {
    return `payroll-status-pill payroll-status-pill--${status.toLowerCase()}`;
  }

  statusLabel(status: PayslipStatus): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
