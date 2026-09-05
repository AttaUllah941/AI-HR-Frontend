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
  JobOpening,
  JobOpeningStatus,
  RecruitmentService,
} from '../../../../core/services/recruitment.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { JobFormDialogComponent } from '../../dialogs/job-form-dialog.component';

const STATUS_OPTIONS: Array<{ value: JobOpeningStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ON_HOLD', label: 'On hold' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

@Component({
  selector: 'app-recruitment-jobs-page',
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
  templateUrl: './recruitment-jobs-page.component.html',
  styleUrl: './recruitment-jobs-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecruitmentJobsPageComponent implements OnInit {
  private readonly recruitment = inject(RecruitmentService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<JobOpening[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionId = signal<string | null>(null);
  readonly menuItem = signal<JobOpening | null>(null);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly pageSize = 20;

  readonly canCreate = this.auth.hasPermission('recruitment:create');
  readonly canUpdate = this.auth.hasPermission('recruitment:update');
  readonly canDelete = this.auth.hasPermission('recruitment:delete');

  readonly statusOptions = STATUS_OPTIONS;
  readonly statusControl = new FormControl<JobOpeningStatus | ''>('', { nonNullable: true });

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
    this.recruitment
      .listJobs({
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
          this.error.set('Unable to load job openings. Please try again.');
          this.loading.set(false);
        },
      });
  }

  openCreate(): void {
    this.dialog
      .open(JobFormDialogComponent, {
        data: {},
        width: '640px',
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

  openEdit(item: JobOpening): void {
    this.dialog
      .open(JobFormDialogComponent, {
        data: { job: item },
        width: '640px',
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

  setMenuItem(item: JobOpening): void {
    this.menuItem.set(item);
  }

  publish(item: JobOpening): void {
    this.confirm
      .open({
        title: 'Publish job',
        message: `Publish ${item.title}? Candidates can apply once it is open.`,
        confirmLabel: 'Publish',
        icon: 'publish',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.recruitment.publishJob(item.id).subscribe({
          next: () => {
            this.toast.success('Job published');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to publish job');
          },
        });
      });
  }

  hold(item: JobOpening): void {
    this.confirm
      .open({
        title: 'Put job on hold',
        message: `Put ${item.title} on hold?`,
        confirmLabel: 'Hold',
        icon: 'pause_circle',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.recruitment.holdJob(item.id).subscribe({
          next: () => {
            this.toast.success('Job put on hold');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to hold job');
          },
        });
      });
  }

  close(item: JobOpening): void {
    this.confirm
      .open({
        title: 'Close job',
        message: `Close ${item.title}? New applications will no longer be accepted.`,
        confirmLabel: 'Close',
        icon: 'lock',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.recruitment.closeJob(item.id).subscribe({
          next: () => {
            this.toast.success('Job closed');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to close job');
          },
        });
      });
  }

  remove(item: JobOpening): void {
    this.confirm
      .open({
        title: 'Delete job',
        message: `Delete ${item.title}? This soft-deletes the opening.`,
        confirmLabel: 'Delete',
        destructive: true,
        icon: 'delete',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.recruitment.deleteJob(item.id).subscribe({
          next: () => {
            this.toast.success('Job deleted');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to delete job');
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

  applicationCount(item: JobOpening): number {
    return item.applicationCount ?? item._count?.applications ?? 0;
  }

  statusClass(status: JobOpeningStatus): string {
    return `recruitment-status-pill recruitment-status-pill--${status.toLowerCase()}`;
  }

  statusLabel(status: string): string {
    return this.recruitment.statusLabel(status);
  }

  canPublish(item: JobOpening): boolean {
    return this.canUpdate && (item.status === 'DRAFT' || item.status === 'ON_HOLD');
  }

  canHold(item: JobOpening): boolean {
    return this.canUpdate && item.status === 'OPEN';
  }

  canClose(item: JobOpening): boolean {
    return this.canUpdate && (item.status === 'OPEN' || item.status === 'ON_HOLD');
  }

  canEdit(item: JobOpening): boolean {
    return this.canCreate && item.status !== 'CLOSED' && item.status !== 'CANCELLED';
  }
}
