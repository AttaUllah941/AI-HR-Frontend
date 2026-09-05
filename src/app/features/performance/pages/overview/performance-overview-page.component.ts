import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import {
  PerformanceMySummary,
  PerformanceService,
  PerformanceSummary,
} from '../../../../core/services/performance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { GoalFormDialogComponent } from '../../dialogs/goal-form-dialog.component';

@Component({
  selector: 'app-performance-overview-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    RouterLink,
    EmptyStateComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './performance-overview-page.component.html',
  styleUrl: './performance-overview-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformanceOverviewPageComponent implements OnInit {
  private readonly performance = inject(PerformanceService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  readonly year = new Date().getFullYear();
  readonly companySummary = signal<PerformanceSummary | null>(null);
  readonly mySummary = signal<PerformanceMySummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly isEmployeeView = signal(false);

  readonly canCreate = this.auth.hasPermission('performance:create');
  readonly canManage =
    this.auth.hasPermission('performance:create') ||
    this.auth.hasPermission('performance:update') ||
    this.auth.hasPermission('performance:approve');

  readonly kpis = computed(() => {
    if (this.isEmployeeView()) {
      const s = this.mySummary();
      return [
        {
          key: 'goals',
          label: 'Active goals',
          value: s?.activeGoals ?? 0,
          icon: 'flag',
          tone: 'info',
        },
        {
          key: 'reviews',
          label: 'Pending reviews',
          value: s?.pendingReviews ?? 0,
          icon: 'rate_review',
          tone: 'warning',
        },
        {
          key: 'rating',
          label: 'Avg rating',
          value: this.performance.formatRating(s?.avgRating),
          icon: 'star',
          tone: 'success',
        },
        {
          key: 'feedback',
          label: 'Feedback received',
          value: s?.feedbackReceived ?? 0,
          icon: 'forum',
          tone: 'neutral',
        },
      ];
    }

    const s = this.companySummary();
    return [
      {
        key: 'goals',
        label: 'Active goals',
        value: s?.activeGoals ?? 0,
        icon: 'flag',
        tone: 'info',
      },
      {
        key: 'reviews',
        label: 'Pending reviews',
        value: s?.pendingReviews ?? 0,
        icon: 'rate_review',
        tone: 'warning',
      },
      {
        key: 'promotions',
        label: 'Pending promotions',
        value: s?.pendingPromotions ?? 0,
        icon: 'move_up',
        tone: 'purple',
      },
      {
        key: 'rating',
        label: 'Avg rating',
        value: this.performance.formatRating(s?.avgRating),
        icon: 'star',
        tone: 'success',
      },
    ];
  });

  readonly recentGoals = computed(() =>
    this.isEmployeeView()
      ? (this.mySummary()?.recentGoals ?? [])
      : (this.companySummary()?.recentGoals ?? []),
  );

  readonly recentReviews = computed(() =>
    this.isEmployeeView()
      ? (this.mySummary()?.recentReviews ?? [])
      : (this.companySummary()?.recentReviews ?? []),
  );

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    if (this.canManage) {
      this.performance.getSummary(this.year).subscribe({
        next: (summary) => {
          this.isEmployeeView.set(false);
          this.companySummary.set(summary);
          this.loading.set(false);
        },
        error: () => this.loadMySummaryFallback(),
      });
      return;
    }

    this.loadMySummary();
  }

  private loadMySummary(): void {
    this.performance.getMySummary(this.year).subscribe({
      next: (summary) => {
        this.isEmployeeView.set(true);
        this.mySummary.set(summary);
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        const message =
          err?.error?.message || err?.message || 'Unable to load performance overview.';
        if (/employee profile/i.test(message)) {
          this.isEmployeeView.set(true);
          this.mySummary.set({
            year: this.year,
            employeeId: '',
            activeGoals: 0,
            completedGoals: 0,
            pendingReviews: 0,
            avgRating: null,
            pendingPromotions: 0,
            feedbackReceived: 0,
            recentGoals: [],
            recentReviews: [],
            recentFeedback: [],
          });
          this.error.set(null);
          this.loading.set(false);
          return;
        }
        this.error.set(message);
        this.loading.set(false);
      },
    });
  }

  private loadMySummaryFallback(): void {
    this.performance.getMySummary(this.year).subscribe({
      next: (summary) => {
        this.isEmployeeView.set(true);
        this.mySummary.set(summary);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load performance overview. Please try again.');
        this.loading.set(false);
      },
    });
  }

  openCreateGoal(): void {
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

  statusClass(status: string): string {
    return `performance-status-pill performance-status-pill--${status.toLowerCase()}`;
  }

  statusLabel(status: string): string {
    return this.performance.statusLabel(status);
  }

  employeeLabel(emp: { firstName: string; lastName: string } | null | undefined): string {
    if (!emp) {
      return '—';
    }
    return `${emp.firstName} ${emp.lastName}`;
  }
}
