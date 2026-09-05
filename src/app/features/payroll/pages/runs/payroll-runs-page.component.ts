import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  PayrollRun,
  PayrollRunStatus,
  PayrollService,
} from '../../../../core/services/payroll.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { PayrollRunFormDialogComponent } from '../../dialogs/payroll-run-form-dialog.component';
import { RunEntriesDialogComponent } from '../../dialogs/run-entries-dialog.component';

const STATUS_OPTIONS: Array<{ value: PayrollRunStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

@Component({
  selector: 'app-payroll-runs-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
    OrganizationSectionHeaderComponent,
  ],
  templateUrl: './payroll-runs-page.component.html',
  styleUrl: './payroll-runs-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollRunsPageComponent implements OnInit {
  private readonly payroll = inject(PayrollService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly currentYear = new Date().getFullYear();
  readonly yearOptions = [this.currentYear - 1, this.currentYear, this.currentYear + 1];

  readonly items = signal<PayrollRun[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionId = signal<string | null>(null);
  readonly menuItem = signal<PayrollRun | null>(null);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly pageSize = 20;

  readonly canCreate = this.auth.hasPermission('payroll:create');
  readonly canUpdate = this.auth.hasPermission('payroll:update');
  readonly canApprove = this.auth.hasPermission('payroll:approve');
  readonly canDelete = this.auth.hasPermission('payroll:delete');

  readonly statusOptions = STATUS_OPTIONS;
  readonly statusControl = new FormControl<PayrollRunStatus | ''>('', { nonNullable: true });
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
    this.payroll
      .listRuns({
        status: this.statusControl.value || undefined,
        year: this.yearControl.value,
        page: this.page(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.total.set(res.pagination.total);
          this.totalPages.set(res.pagination.totalPages);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Unable to load payroll runs. Please try again.');
          this.loading.set(false);
        },
      });
  }

  openCreate(): void {
    this.dialog
      .open(PayrollRunFormDialogComponent, {
        data: {},
        width: '480px',
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

  openEdit(item: PayrollRun): void {
    this.dialog
      .open(PayrollRunFormDialogComponent, {
        data: { run: item },
        width: '480px',
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

  openEntries(item: PayrollRun): void {
    this.dialog.open(RunEntriesDialogComponent, {
      data: { run: item },
      width: '720px',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });
  }

  setMenuItem(item: PayrollRun): void {
    this.menuItem.set(item);
  }

  process(item: PayrollRun): void {
    this.confirm
      .open({
        title: 'Process payroll run',
        message: `Process ${this.runLabel(item)}? This generates entries and payslips from active salary structures.`,
        confirmLabel: 'Process',
        icon: 'play_circle',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.payroll.processRun(item.id).subscribe({
          next: () => {
            this.toast.success('Payroll run processed');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to process payroll run');
          },
        });
      });
  }

  approve(item: PayrollRun): void {
    this.confirm
      .open({
        title: 'Approve payroll run',
        message: `Approve ${this.runLabel(item)}?`,
        confirmLabel: 'Approve',
        icon: 'check_circle',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.payroll.approveRun(item.id).subscribe({
          next: () => {
            this.toast.success('Payroll run approved');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to approve payroll run');
          },
        });
      });
  }

  markPaid(item: PayrollRun): void {
    this.confirm
      .open({
        title: 'Mark payroll as paid',
        message: `Mark ${this.runLabel(item)} and its payslips as paid?`,
        confirmLabel: 'Mark paid',
        icon: 'paid',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.payroll.markPaid(item.id).subscribe({
          next: () => {
            this.toast.success('Payroll marked as paid');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to mark payroll as paid');
          },
        });
      });
  }

  cancel(item: PayrollRun): void {
    this.confirm
      .open({
        title: 'Cancel payroll run',
        message: `Cancel ${this.runLabel(item)}? This cannot be undone.`,
        confirmLabel: 'Cancel run',
        destructive: true,
        icon: 'cancel',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.payroll.cancelRun(item.id).subscribe({
          next: () => {
            this.toast.success('Payroll run cancelled');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to cancel payroll run');
          },
        });
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

  runLabel(item: PayrollRun): string {
    return item.title || `${this.payroll.monthLabel(item.month)} ${item.year}`;
  }

  monthLabel(month: number): string {
    return this.payroll.monthLabel(month);
  }

  entryCount(item: PayrollRun): number {
    return item.entryCount ?? item._count?.entries ?? 0;
  }

  statusClass(status: PayrollRunStatus): string {
    return `payroll-status-pill payroll-status-pill--${status.toLowerCase()}`;
  }

  statusLabel(status: PayrollRunStatus): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  canProcess(item: PayrollRun): boolean {
    return this.canUpdate && (item.status === 'DRAFT' || item.status === 'COMPLETED');
  }

  canApproveRun(item: PayrollRun): boolean {
    return this.canApprove && item.status === 'COMPLETED';
  }

  canMarkPaid(item: PayrollRun): boolean {
    return this.canApprove && item.status === 'APPROVED';
  }

  canCancelRun(item: PayrollRun): boolean {
    return this.canDelete && (item.status === 'DRAFT' || item.status === 'COMPLETED');
  }

  canEdit(item: PayrollRun): boolean {
    return this.canCreate && (item.status === 'DRAFT' || item.status === 'COMPLETED');
  }
}
