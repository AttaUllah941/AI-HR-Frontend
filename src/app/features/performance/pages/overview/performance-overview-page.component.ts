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
import { EchartComponent } from '../../../../shared/charts/echart.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { goalsOption, reviewsOption, statusText } from '../../charts/performance-chart-options';
import { GoalFormDialogComponent } from '../../dialogs/goal-form-dialog.component';

const GOAL_LEGEND: Record<string, string> = {
  ACTIVE: 'var(--zh-primary)',
  COMPLETED: 'var(--zh-success)',
  DRAFT: 'var(--zh-muted-foreground)',
  CANCELLED: 'var(--zh-destructive)',
};

@Component({
  selector: 'app-performance-overview-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    RouterLink,
    EchartComponent,
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

  private readonly goalCounts = computed(() =>
    this.isEmployeeView() ? undefined : this.companySummary()?.goalsByStatus,
  );
  private readonly reviewCounts = computed(() =>
    this.isEmployeeView() ? undefined : this.companySummary()?.reviewsByStatus,
  );

  /** Company view only: how goals and reviews are spread across their statuses. */
  readonly goalChart = computed(() => {
    const counts = this.goalCounts();
    return (theme: Parameters<typeof goalsOption>[1]) => goalsOption(counts, theme);
  });
  readonly reviewChart = computed(() => {
    const counts = this.reviewCounts();
    return (theme: Parameters<typeof reviewsOption>[1]) => reviewsOption(counts, theme);
  });

  readonly goalLegend = computed(() => this.legend(this.goalCounts(), GOAL_LEGEND));
  readonly totalGoals = computed(() => this.goalLegend().reduce((s, l) => s + l.value, 0));
  readonly totalReviews = computed(() =>
    Object.values(this.reviewCounts() ?? {}).reduce((s, v) => s + v, 0),
  );

  private legend(counts: Record<string, number> | undefined, colors: Record<string, string>) {
    return Object.keys(colors)
      .filter((k) => (counts?.[k] ?? 0) > 0)
      .map((k) => ({ key: k, label: statusText(k), value: counts![k]!, color: colors[k]! }));
  }

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
    return statusText(status);
  }

  /** Goal progress clamped to 0-100 for the bar. */
  progressWidth(progress: number | null | undefined): number {
    return Math.max(0, Math.min(100, progress ?? 0));
  }

  /** Review rating out of 5 as a number, or an em dash when not yet rated. */
  rating(value: number | null | undefined): string {
    return this.performance.formatRating(value);
  }

  employeeLabel(emp: { firstName: string; lastName: string } | null | undefined): string {
    if (!emp) {
      return '—';
    }
    return `${emp.firstName} ${emp.lastName}`;
  }
}
