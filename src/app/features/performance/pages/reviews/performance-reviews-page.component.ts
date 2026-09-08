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
  PerformanceReview,
  PerformanceService,
  ReviewCycle,
  ReviewStatus,
} from '../../../../core/services/performance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { ReviewCycleFormDialogComponent } from '../../dialogs/review-cycle-form-dialog.component';
import { ReviewFormDialogComponent } from '../../dialogs/review-form-dialog.component';

const STATUS_OPTIONS: Array<{ value: ReviewStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

@Component({
  selector: 'app-performance-reviews-page',
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
  templateUrl: './performance-reviews-page.component.html',
  styleUrl: './performance-reviews-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformanceReviewsPageComponent implements OnInit {
  private readonly api = inject(PerformanceService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly currentYear = new Date().getFullYear();
  readonly yearOptions = [this.currentYear - 1, this.currentYear, this.currentYear + 1];

  readonly cycles = signal<ReviewCycle[]>([]);
  readonly items = signal<PerformanceReview[]>([]);
  readonly cyclesLoading = signal(true);
  readonly loading = signal(true);
  readonly cyclesError = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly actionId = signal<string | null>(null);
  readonly menuCycle = signal<ReviewCycle | null>(null);
  readonly menuItem = signal<PerformanceReview | null>(null);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly pageSize = 20;

  readonly canCreate = this.auth.hasPermission('performance:create');
  readonly canUpdate = this.auth.hasPermission('performance:update');
  readonly canApprove = this.auth.hasPermission('performance:approve');
  readonly canDelete = this.auth.hasPermission('performance:delete');

  readonly statusOptions = STATUS_OPTIONS;
  readonly statusControl = new FormControl<ReviewStatus | ''>('', { nonNullable: true });
  readonly yearControl = new FormControl(this.currentYear, { nonNullable: true });
  readonly cycleControl = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.statusControl.valueChanges.subscribe(() => {
      this.page.set(1);
      this.reloadReviews();
    });
    this.cycleControl.valueChanges.subscribe(() => {
      this.page.set(1);
      this.reloadReviews();
    });
    this.yearControl.valueChanges.subscribe(() => this.reloadCycles());
    this.reload();
  }

  reload(): void {
    this.reloadCycles();
    this.reloadReviews();
  }

  reloadCycles(): void {
    this.cyclesLoading.set(true);
    this.cyclesError.set(null);
    this.api.listCycles({ year: this.yearControl.value, page: 1, pageSize: 50 }).subscribe({
      next: (res) => {
        this.cycles.set(Array.isArray(res) ? res : res.items);
        this.cyclesLoading.set(false);
      },
      error: () => {
        this.cyclesError.set('Unable to load review cycles.');
        this.cyclesLoading.set(false);
      },
    });
  }

  reloadReviews(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .listReviews({
        status: this.statusControl.value || undefined,
        cycleId: this.cycleControl.value || undefined,
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
          this.error.set('Unable to load reviews. Please try again.');
          this.loading.set(false);
        },
      });
  }

  openCreateCycle(): void {
    this.dialog
      .open(ReviewCycleFormDialogComponent, {
        data: { year: this.yearControl.value },
        width: '520px',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.reloadCycles();
        }
      });
  }

  openEditCycle(item: ReviewCycle): void {
    this.dialog
      .open(ReviewCycleFormDialogComponent, {
        data: { cycle: item },
        width: '520px',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.reloadCycles();
        }
      });
  }

  activateCycle(item: ReviewCycle): void {
    this.confirm
      .open({
        title: 'Activate cycle',
        message: `Activate “${item.name}”?`,
        confirmLabel: 'Activate',
        icon: 'play_circle',
      })
      .pipe(filter((c) => c === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.api.activateCycle(item.id).subscribe({
          next: () => {
            this.toast.success('Cycle activated');
            this.actionId.set(null);
            this.reloadCycles();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to activate cycle');
          },
        });
      });
  }

  closeCycle(item: ReviewCycle): void {
    this.confirm
      .open({
        title: 'Close cycle',
        message: `Close “${item.name}”?`,
        confirmLabel: 'Close',
        icon: 'lock',
      })
      .pipe(filter((c) => c === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.api.closeCycle(item.id).subscribe({
          next: () => {
            this.toast.success('Cycle closed');
            this.actionId.set(null);
            this.reloadCycles();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to close cycle');
          },
        });
      });
  }

  deleteCycle(item: ReviewCycle): void {
    this.confirm
      .open({
        title: 'Delete cycle',
        message: `Delete “${item.name}”?`,
        confirmLabel: 'Delete',
        destructive: true,
        icon: 'delete',
      })
      .pipe(filter((c) => c === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.api.deleteCycle(item.id).subscribe({
          next: () => {
            this.toast.success('Cycle deleted');
            this.actionId.set(null);
            this.reloadCycles();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to delete cycle');
          },
        });
      });
  }

  openCreateReview(): void {
    this.dialog
      .open(ReviewFormDialogComponent, {
        data: { cycles: this.cycles() },
        width: '640px',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.reloadReviews();
        }
      });
  }

  openEditReview(item: PerformanceReview): void {
    this.dialog
      .open(ReviewFormDialogComponent, {
        data: { review: item, cycles: this.cycles() },
        width: '640px',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.reloadReviews();
        }
      });
  }

  submitReview(item: PerformanceReview): void {
    this.confirm
      .open({
        title: 'Submit review',
        message: 'Submit this review for acknowledgment?',
        confirmLabel: 'Submit',
        icon: 'send',
      })
      .pipe(filter((c) => c === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.api.submitReview(item.id).subscribe({
          next: () => {
            this.toast.success('Review submitted');
            this.actionId.set(null);
            this.reloadReviews();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to submit review');
          },
        });
      });
  }

  acknowledgeReview(item: PerformanceReview): void {
    this.confirm
      .open({
        title: 'Acknowledge review',
        message: 'Mark this review as acknowledged by the employee?',
        confirmLabel: 'Acknowledge',
        icon: 'thumb_up',
      })
      .pipe(filter((c) => c === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.api.acknowledgeReview(item.id).subscribe({
          next: () => {
            this.toast.success('Review acknowledged');
            this.actionId.set(null);
            this.reloadReviews();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to acknowledge review');
          },
        });
      });
  }

  completeReview(item: PerformanceReview): void {
    this.confirm
      .open({
        title: 'Complete review',
        message: 'Mark this review as completed?',
        confirmLabel: 'Complete',
        icon: 'check_circle',
      })
      .pipe(filter((c) => c === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.api.completeReview(item.id).subscribe({
          next: () => {
            this.toast.success('Review completed');
            this.actionId.set(null);
            this.reloadReviews();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to complete review');
          },
        });
      });
  }

  setMenuCycle(item: ReviewCycle): void {
    this.menuCycle.set(item);
  }

  setMenuItem(item: PerformanceReview): void {
    this.menuItem.set(item);
  }

  prevPage(): void {
    if (this.page() <= 1) {
      return;
    }
    this.page.update((p) => p - 1);
    this.reloadReviews();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }
    this.page.update((p) => p + 1);
    this.reloadReviews();
  }

  employeeLabel(item: PerformanceReview): string {
    return this.api.employeeLabel(item.employee);
  }

  reviewerLabel(item: PerformanceReview): string {
    return this.api.employeeLabel(item.reviewer);
  }

  statusClass(status: string): string {
    return `performance-status-pill performance-status-pill--${status.toLowerCase()}`;
  }

  statusLabel(status: string): string {
    return this.api.statusLabel(status);
  }

  reviewCount(item: ReviewCycle): number {
    return item.reviewCount ?? item._count?.reviews ?? 0;
  }

  canSubmit(item: PerformanceReview): boolean {
    return this.canUpdate && (item.status === 'DRAFT' || item.status === 'IN_PROGRESS');
  }

  canAcknowledge(item: PerformanceReview): boolean {
    return this.canUpdate && item.status === 'SUBMITTED';
  }

  canComplete(item: PerformanceReview): boolean {
    return this.canApprove && (item.status === 'ACKNOWLEDGED' || item.status === 'SUBMITTED');
  }
}
