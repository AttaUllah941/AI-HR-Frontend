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
  Interview,
  InterviewStatus,
  RecruitmentService,
} from '../../../../core/services/recruitment.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { InterviewFormDialogComponent } from '../../dialogs/interview-form-dialog.component';
import { InterviewCompleteDialogComponent } from '../../dialogs/interview-complete-dialog.component';

const STATUS_OPTIONS: Array<{ value: InterviewStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No show' },
];

@Component({
  selector: 'app-recruitment-interviews-page',
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
  templateUrl: './recruitment-interviews-page.component.html',
  styleUrl: './recruitment-interviews-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecruitmentInterviewsPageComponent implements OnInit {
  private readonly recruitment = inject(RecruitmentService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<Interview[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionId = signal<string | null>(null);
  readonly menuItem = signal<Interview | null>(null);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly pageSize = 20;

  readonly canCreate = this.auth.hasPermission('recruitment:create');
  readonly canUpdate = this.auth.hasPermission('recruitment:update');
  readonly canDelete = this.auth.hasPermission('recruitment:delete');

  readonly statusOptions = STATUS_OPTIONS;
  readonly statusControl = new FormControl<InterviewStatus | ''>('', { nonNullable: true });
  readonly viewControl = new FormControl<'all' | 'upcoming' | 'past'>('upcoming', {
    nonNullable: true,
  });

  ngOnInit(): void {
    this.statusControl.valueChanges.subscribe(() => {
      this.page.set(1);
      this.reload();
    });
    this.viewControl.valueChanges.subscribe(() => {
      this.page.set(1);
      this.reload();
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const view = this.viewControl.value;
    this.recruitment
      .listInterviews({
        status: this.statusControl.value || undefined,
        upcoming: view === 'upcoming' ? true : undefined,
        page: this.page(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          let items = res.items;
          if (view === 'past') {
            const now = Date.now();
            items = items.filter(
              (i) => i.status !== 'SCHEDULED' || new Date(i.scheduledAt).getTime() < now,
            );
          }
          this.items.set(items);
          this.total.set(res.pagination.total);
          this.totalPages.set(res.pagination.totalPages);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Unable to load interviews. Please try again.');
          this.loading.set(false);
        },
      });
  }

  openCreate(): void {
    this.dialog
      .open(InterviewFormDialogComponent, {
        data: {},
        width: '560px',
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

  openEdit(item: Interview): void {
    this.dialog
      .open(InterviewFormDialogComponent, {
        data: { interview: item },
        width: '560px',
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

  openComplete(item: Interview): void {
    this.dialog
      .open(InterviewCompleteDialogComponent, {
        data: { interview: item },
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

  setMenuItem(item: Interview): void {
    this.menuItem.set(item);
  }

  remove(item: Interview): void {
    this.confirm
      .open({
        title: 'Delete interview',
        message: 'Delete this interview schedule?',
        confirmLabel: 'Delete',
        destructive: true,
        icon: 'delete',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.recruitment.deleteInterview(item.id).subscribe({
          next: () => {
            this.toast.success('Interview deleted');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to delete interview');
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

  candidateName(item: Interview): string {
    const c = item.application?.candidate;
    return c ? `${c.firstName} ${c.lastName}` : '—';
  }

  jobTitle(item: Interview): string {
    return item.application?.jobOpening?.title ?? '—';
  }

  interviewerName(item: Interview): string {
    const e = item.interviewer;
    return e ? `${e.firstName} ${e.lastName}` : '—';
  }

  formatWhen(value: string): string {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  }

  statusClass(status: InterviewStatus): string {
    return `recruitment-status-pill recruitment-status-pill--${status.toLowerCase()}`;
  }

  statusLabel(status: string): string {
    return this.recruitment.statusLabel(status);
  }

  canComplete(item: Interview): boolean {
    return this.canUpdate && item.status === 'SCHEDULED';
  }

  canEdit(item: Interview): boolean {
    return this.canCreate && item.status === 'SCHEDULED';
  }
}
