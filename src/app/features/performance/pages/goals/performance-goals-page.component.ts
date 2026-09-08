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
  GoalPriority,
  GoalStatus,
  PerformanceGoal,
  PerformanceService,
} from '../../../../core/services/performance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { GoalFormDialogComponent } from '../../dialogs/goal-form-dialog.component';

const STATUS_OPTIONS: Array<{ value: GoalStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PRIORITY_OPTIONS: Array<{ value: GoalPriority | ''; label: string }> = [
  { value: '', label: 'All priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

@Component({
  selector: 'app-performance-goals-page',
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
  templateUrl: './performance-goals-page.component.html',
  styleUrl: './performance-goals-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformanceGoalsPageComponent implements OnInit {
  private readonly api = inject(PerformanceService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<PerformanceGoal[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionId = signal<string | null>(null);
  readonly menuItem = signal<PerformanceGoal | null>(null);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly pageSize = 20;

  readonly canCreate = this.auth.hasPermission('performance:create');
  readonly canUpdate = this.auth.hasPermission('performance:update');
  readonly canDelete = this.auth.hasPermission('performance:delete');

  readonly statusOptions = STATUS_OPTIONS;
  readonly priorityOptions = PRIORITY_OPTIONS;
  readonly statusControl = new FormControl<GoalStatus | ''>('', { nonNullable: true });
  readonly priorityControl = new FormControl<GoalPriority | ''>('', { nonNullable: true });

  ngOnInit(): void {
    this.statusControl.valueChanges.subscribe(() => {
      this.page.set(1);
      this.reload();
    });
    this.priorityControl.valueChanges.subscribe(() => {
      this.page.set(1);
      this.reload();
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .listGoals({
        status: this.statusControl.value || undefined,
        priority: this.priorityControl.value || undefined,
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
          this.error.set('Unable to load goals. Please try again.');
          this.loading.set(false);
        },
      });
  }

  openCreate(): void {
    this.dialog
      .open(GoalFormDialogComponent, {
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

  openEdit(item: PerformanceGoal): void {
    this.dialog
      .open(GoalFormDialogComponent, {
        data: { goal: item },
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

  bumpProgress(item: PerformanceGoal, delta: number): void {
    const progress = Math.max(0, Math.min(100, (item.progress ?? 0) + delta));
    this.actionId.set(item.id);
    this.api.updateGoal(item.id, { progress }).subscribe({
      next: () => {
        this.toast.success('Goal progress updated');
        this.actionId.set(null);
        this.reload();
      },
      error: (err: Error) => {
        this.actionId.set(null);
        this.toast.error(err.message || 'Unable to update progress');
      },
    });
  }

  remove(item: PerformanceGoal): void {
    this.confirm
      .open({
        title: 'Delete goal',
        message: `Delete “${item.title}”? This cannot be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
        icon: 'delete',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.api.deleteGoal(item.id).subscribe({
          next: () => {
            this.toast.success('Goal deleted');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to delete goal');
          },
        });
      });
  }

  setMenuItem(item: PerformanceGoal): void {
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

  employeeLabel(item: PerformanceGoal): string {
    return this.api.employeeLabel(item.employee);
  }

  statusClass(status: string): string {
    return `performance-status-pill performance-status-pill--${status.toLowerCase()}`;
  }

  statusLabel(status: string): string {
    return this.api.statusLabel(status);
  }
}
