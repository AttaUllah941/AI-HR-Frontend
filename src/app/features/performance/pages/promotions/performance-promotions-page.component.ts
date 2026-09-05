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
  PerformanceService,
  PromotionRequest,
  PromotionStatus,
} from '../../../../core/services/performance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { PromotionFormDialogComponent } from '../../dialogs/promotion-form-dialog.component';
import { PromotionReviewDialogComponent } from '../../dialogs/promotion-review-dialog.component';

const STATUS_OPTIONS: Array<{ value: PromotionStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
];

@Component({
  selector: 'app-performance-promotions-page',
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
  templateUrl: './performance-promotions-page.component.html',
  styleUrl: './performance-promotions-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformancePromotionsPageComponent implements OnInit {
  private readonly api = inject(PerformanceService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<PromotionRequest[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionId = signal<string | null>(null);
  readonly menuItem = signal<PromotionRequest | null>(null);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly pageSize = 20;

  readonly canCreate = this.auth.hasPermission('performance:create');
  readonly canUpdate = this.auth.hasPermission('performance:update');
  readonly canApprove = this.auth.hasPermission('performance:approve');
  readonly canDelete = this.auth.hasPermission('performance:delete');

  readonly statusOptions = STATUS_OPTIONS;
  readonly statusControl = new FormControl<PromotionStatus | ''>('', { nonNullable: true });

  ngOnInit(): void {
    this.statusControl.valueChanges.subscribe(() => {
      this.page.set(1);
      this.reload();
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .listPromotions({
        status: this.statusControl.value || undefined,
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
          this.error.set('Unable to load promotions. Please try again.');
          this.loading.set(false);
        },
      });
  }

  openCreate(): void {
    this.dialog
      .open(PromotionFormDialogComponent, {
        data: {},
        width: '600px',
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

  openEdit(item: PromotionRequest): void {
    this.dialog
      .open(PromotionFormDialogComponent, {
        data: { promotion: item },
        width: '600px',
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

  submit(item: PromotionRequest): void {
    this.confirm
      .open({
        title: 'Submit promotion',
        message: 'Submit this promotion request for approval?',
        confirmLabel: 'Submit',
        icon: 'send',
      })
      .pipe(filter((c) => c === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.api.submitPromotion(item.id).subscribe({
          next: () => {
            this.toast.success('Promotion submitted');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to submit promotion');
          },
        });
      });
  }

  openReview(item: PromotionRequest, approve: boolean): void {
    this.dialog
      .open(PromotionReviewDialogComponent, {
        data: { promotion: item, approve },
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

  withdraw(item: PromotionRequest): void {
    this.confirm
      .open({
        title: 'Withdraw promotion',
        message: 'Withdraw this promotion request?',
        confirmLabel: 'Withdraw',
        destructive: true,
        icon: 'undo',
      })
      .pipe(filter((c) => c === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.api.withdrawPromotion(item.id).subscribe({
          next: () => {
            this.toast.success('Promotion withdrawn');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to withdraw promotion');
          },
        });
      });
  }

  setMenuItem(item: PromotionRequest): void {
    this.menuItem.set(item);
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

  employeeLabel(item: PromotionRequest): string {
    return this.api.employeeLabel(item.employee);
  }

  proposedLabel(item: PromotionRequest): string {
    return item.proposedTitle || item.proposedDesignation?.name || '—';
  }

  statusClass(status: string): string {
    return `performance-status-pill performance-status-pill--${status.toLowerCase()}`;
  }

  statusLabel(status: string): string {
    return this.api.statusLabel(status);
  }

  canSubmit(item: PromotionRequest): boolean {
    return this.canUpdate && item.status === 'DRAFT';
  }

  canReview(item: PromotionRequest): boolean {
    return this.canApprove && item.status === 'PENDING';
  }

  canWithdraw(item: PromotionRequest): boolean {
    return this.canDelete && (item.status === 'DRAFT' || item.status === 'PENDING');
  }

  canEdit(item: PromotionRequest): boolean {
    return this.canUpdate && item.status === 'DRAFT';
  }
}
