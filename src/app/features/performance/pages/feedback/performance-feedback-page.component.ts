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
  FeedbackType,
  PerformanceFeedback,
  PerformanceService,
} from '../../../../core/services/performance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { FeedbackFormDialogComponent } from '../../dialogs/feedback-form-dialog.component';

const TYPE_OPTIONS: Array<{ value: FeedbackType | ''; label: string }> = [
  { value: '', label: 'All types' },
  { value: 'PEER', label: 'Peer' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'SELF', label: 'Self' },
  { value: 'UPWARD', label: 'Upward' },
  { value: 'GENERAL', label: 'General' },
];

const DIRECTION_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'received', label: 'Received' },
  { value: 'given', label: 'Given' },
] as const;

@Component({
  selector: 'app-performance-feedback-page',
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
  templateUrl: './performance-feedback-page.component.html',
  styleUrl: './performance-feedback-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformanceFeedbackPageComponent implements OnInit {
  private readonly api = inject(PerformanceService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<PerformanceFeedback[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionId = signal<string | null>(null);
  readonly menuItem = signal<PerformanceFeedback | null>(null);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly pageSize = 20;

  readonly canCreate = this.auth.hasPermission('performance:create');
  readonly canDelete = this.auth.hasPermission('performance:delete');

  readonly typeOptions = TYPE_OPTIONS;
  readonly directionOptions = DIRECTION_OPTIONS;
  readonly typeControl = new FormControl<FeedbackType | ''>('', { nonNullable: true });
  readonly directionControl = new FormControl<'received' | 'given' | ''>('', { nonNullable: true });

  ngOnInit(): void {
    this.typeControl.valueChanges.subscribe(() => {
      this.page.set(1);
      this.reload();
    });
    this.directionControl.valueChanges.subscribe(() => {
      this.page.set(1);
      this.reload();
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .listFeedback({
        type: this.typeControl.value || undefined,
        direction: this.directionControl.value || undefined,
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
          this.error.set('Unable to load feedback. Please try again.');
          this.loading.set(false);
        },
      });
  }

  openCreate(): void {
    this.dialog
      .open(FeedbackFormDialogComponent, {
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

  remove(item: PerformanceFeedback): void {
    this.confirm
      .open({
        title: 'Delete feedback',
        message: 'Delete this feedback entry?',
        confirmLabel: 'Delete',
        destructive: true,
        icon: 'delete',
      })
      .pipe(filter((c) => c === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.api.deleteFeedback(item.id).subscribe({
          next: () => {
            this.toast.success('Feedback deleted');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to delete feedback');
          },
        });
      });
  }

  setMenuItem(item: PerformanceFeedback): void {
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

  fromLabel(item: PerformanceFeedback): string {
    if (item.isAnonymous) {
      return 'Anonymous';
    }
    return this.api.employeeLabel(item.fromEmployee);
  }

  toLabel(item: PerformanceFeedback): string {
    return this.api.employeeLabel(item.toEmployee);
  }

  statusClass(type: string): string {
    return `performance-status-pill performance-status-pill--${type.toLowerCase() === 'general' ? 'generated' : 'draft'}`;
  }

  statusLabel(type: string): string {
    return this.api.statusLabel(type);
  }

  excerpt(content: string): string {
    if (content.length <= 80) {
      return content;
    }
    return `${content.slice(0, 80)}…`;
  }
}
