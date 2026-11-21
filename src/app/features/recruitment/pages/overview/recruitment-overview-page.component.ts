import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import {
  Interview,
  JobOpening,
  RecruitmentService,
  RecruitmentSummary,
} from '../../../../core/services/recruitment.service';
import { AuthService } from '../../../../core/services/auth.service';
import { formatDate, formatTime } from '../../../../core/utils/date-format';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { JobFormDialogComponent } from '../../dialogs/job-form-dialog.component';

/** Stage order and colour for the funnel (colours are theme tokens, so dark mode works). */
const FUNNEL_STAGES = [
  { key: 'APPLIED', label: 'Applied', color: 'var(--zh-muted-foreground)' },
  { key: 'SCREENING', label: 'Screening', color: 'var(--zh-secondary)' },
  { key: 'INTERVIEW', label: 'Interview', color: 'var(--zh-primary)' },
  { key: 'OFFER', label: 'Offer', color: 'var(--zh-warning)' },
  { key: 'HIRED', label: 'Hired', color: 'var(--zh-success)' },
] as const;

@Component({
  selector: 'app-recruitment-overview-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    RouterLink,
    EmptyStateComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './recruitment-overview-page.component.html',
  styleUrl: './recruitment-overview-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecruitmentOverviewPageComponent implements OnInit {
  private readonly recruitment = inject(RecruitmentService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  readonly summary = signal<RecruitmentSummary | null>(null);
  readonly upcoming = signal<Interview[]>([]);
  readonly openRoles = signal<JobOpening[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly canCreate = this.auth.hasPermission('recruitment:create');

  readonly kpis = computed(() => {
    const s = this.summary();
    return [
      { key: 'openJobs', label: 'Open jobs', value: s?.openJobs ?? 0, icon: 'work', tone: 'info' },
      { key: 'candidates', label: 'Candidates', value: s?.candidates ?? 0, icon: 'person_search', tone: 'neutral' },
      { key: 'interviews', label: 'Interviews scheduled', value: s?.interviewsScheduled ?? 0, icon: 'event', tone: 'warning' },
      { key: 'offers', label: 'Offers pending', value: s?.offersPending ?? 0, icon: 'handshake', tone: 'success' },
    ];
  });

  /** Applications per stage, with bar widths relative to the busiest stage. */
  readonly funnel = computed(() => {
    const by = this.summary()?.applicationsByStatus ?? {};
    const rows = FUNNEL_STAGES.map((s) => ({ ...s, count: by[s.key] ?? 0 }));
    const max = Math.max(1, ...rows.map((r) => r.count));
    return rows.map((r) => ({ ...r, percent: Math.round((r.count / max) * 100) }));
  });

  readonly funnelTotal = computed(() => this.funnel().reduce((sum, r) => sum + r.count, 0));

  /** Applications that left the pipeline without a hire (rejected or withdrawn). */
  readonly closedCount = computed(() => {
    const by = this.summary()?.applicationsByStatus ?? {};
    return (by['REJECTED'] ?? 0) + (by['WITHDRAWN'] ?? 0);
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.recruitment.getSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
        this.loadPanels();
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load recruitment overview.');
        this.loading.set(false);
      },
    });
  }

  /** Side panels load after the page: if one fails it just shows empty instead of blocking the overview. */
  private loadPanels(): void {
    this.recruitment.listInterviews({ upcoming: true, status: 'SCHEDULED', page: 1, pageSize: 5 }).subscribe({
      next: (res) => this.upcoming.set(res.items),
      error: () => this.upcoming.set([]),
    });
    this.recruitment.listJobs({ status: 'OPEN', page: 1, pageSize: 5 }).subscribe({
      next: (res) => this.openRoles.set(res.items),
      error: () => this.openRoles.set([]),
    });
  }

  openCreateJob(): void {
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

  candidateName(item: Interview): string {
    const c = item.application?.candidate;
    return c ? `${c.firstName} ${c.lastName}` : 'Candidate';
  }

  jobTitle(item: Interview): string {
    return item.application?.jobOpening?.title ?? 'Job';
  }

  interviewDate(item: Interview): string {
    return formatDate(item.scheduledAt);
  }

  interviewTime(item: Interview): string {
    return formatTime(item.scheduledAt);
  }

  typeLabel(value: string): string {
    return this.recruitment.statusLabel(value);
  }

  applicationCount(job: JobOpening): number {
    return job._count?.applications ?? job.applicationCount ?? 0;
  }
}
