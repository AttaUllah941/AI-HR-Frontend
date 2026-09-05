import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import {
  RecruitmentService,
  RecruitmentSummary,
} from '../../../../core/services/recruitment.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { JobFormDialogComponent } from '../../dialogs/job-form-dialog.component';

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
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly canCreate = this.auth.hasPermission('recruitment:create');

  readonly kpis = computed(() => {
    const s = this.summary();
    return [
      {
        key: 'openJobs',
        label: 'Open jobs',
        value: s?.openJobs ?? 0,
        icon: 'work',
        tone: 'info',
      },
      {
        key: 'candidates',
        label: 'Candidates',
        value: s?.candidates ?? 0,
        icon: 'person_search',
        tone: 'neutral',
      },
      {
        key: 'interviews',
        label: 'Interviews scheduled',
        value: s?.interviewsScheduled ?? 0,
        icon: 'event',
        tone: 'warning',
      },
      {
        key: 'offers',
        label: 'Offers pending',
        value: s?.offersPending ?? 0,
        icon: 'handshake',
        tone: 'success',
      },
    ];
  });

  readonly quickLinks = [
    {
      label: 'Jobs',
      description: 'Openings and publishing',
      route: '/recruitment/jobs',
      icon: 'work',
    },
    {
      label: 'Candidates',
      description: 'Talent pool and screening',
      route: '/recruitment/candidates',
      icon: 'person_search',
    },
    {
      label: 'Pipeline',
      description: 'Application stages',
      route: '/recruitment/pipeline',
      icon: 'view_kanban',
    },
    {
      label: 'Interviews',
      description: 'Schedule and feedback',
      route: '/recruitment/interviews',
      icon: 'event',
    },
    {
      label: 'Offers',
      description: 'Send and track offers',
      route: '/recruitment/offers',
      icon: 'handshake',
    },
  ];

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
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load recruitment overview.');
        this.loading.set(false);
      },
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
}
