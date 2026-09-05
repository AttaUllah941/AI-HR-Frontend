import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  ApplicationStatus,
  JobApplication,
  JobOpening,
  PipelineColumn,
  RecruitmentService,
} from '../../../../core/services/recruitment.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { ApplicationFormDialogComponent } from '../../dialogs/application-form-dialog.component';

const STAGE_ORDER: ApplicationStatus[] = [
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
];

const NEXT_STATUS: Partial<Record<ApplicationStatus, ApplicationStatus>> = {
  APPLIED: 'SCREENING',
  SCREENING: 'INTERVIEW',
  INTERVIEW: 'OFFER',
  OFFER: 'HIRED',
};

@Component({
  selector: 'app-recruitment-pipeline-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
    OrganizationSectionHeaderComponent,
  ],
  templateUrl: './recruitment-pipeline-page.component.html',
  styleUrl: './recruitment-pipeline-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecruitmentPipelinePageComponent implements OnInit {
  private readonly recruitment = inject(RecruitmentService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  readonly columns = signal<PipelineColumn[]>([]);
  readonly jobs = signal<JobOpening[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionId = signal<string | null>(null);

  readonly canCreate = this.auth.hasPermission('recruitment:create');
  readonly canUpdate = this.auth.hasPermission('recruitment:update');
  readonly canApprove = this.auth.hasPermission('recruitment:approve');

  readonly jobControl = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.recruitment.listJobs({ page: 1, pageSize: 100 }).subscribe({
      next: (res) => this.jobs.set(res.items),
      error: () => this.jobs.set([]),
    });
    this.jobControl.valueChanges.subscribe(() => this.reload());
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.recruitment.getPipeline(this.jobControl.value || undefined).subscribe({
      next: (pipeline) => {
        this.columns.set(this.normalizeColumns(pipeline.columns ?? []));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load pipeline. Please try again.');
        this.loading.set(false);
      },
    });
  }

  openCreateApplication(): void {
    this.dialog
      .open(ApplicationFormDialogComponent, {
        data: { jobOpeningId: this.jobControl.value || undefined },
        width: '520px',
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

  advance(app: JobApplication): void {
    const next = NEXT_STATUS[app.status];
    if (!next) {
      return;
    }
    if (next === 'HIRED' && !this.canApprove && !this.canUpdate) {
      this.toast.error('You do not have permission to hire');
      return;
    }
    this.actionId.set(app.id);
    this.recruitment.updateApplicationStatus(app.id, { status: next }).subscribe({
      next: () => {
        this.toast.success(`Moved to ${this.statusLabel(next)}`);
        this.actionId.set(null);
        this.reload();
      },
      error: (err: Error) => {
        this.actionId.set(null);
        this.toast.error(err.message || 'Unable to update status');
      },
    });
  }

  reject(app: JobApplication): void {
    this.actionId.set(app.id);
    this.recruitment.rejectApplication(app.id, {}).subscribe({
      next: () => {
        this.toast.success('Application rejected');
        this.actionId.set(null);
        this.reload();
      },
      error: (err: Error) => {
        this.actionId.set(null);
        this.toast.error(err.message || 'Unable to reject application');
      },
    });
  }

  canAdvance(app: JobApplication): boolean {
    return this.canUpdate && !!NEXT_STATUS[app.status];
  }

  canReject(app: JobApplication): boolean {
    return (
      this.canUpdate &&
      !['HIRED', 'REJECTED', 'WITHDRAWN'].includes(app.status)
    );
  }

  candidateName(app: JobApplication): string {
    if (app.candidate) {
      return `${app.candidate.firstName} ${app.candidate.lastName}`;
    }
    return 'Candidate';
  }

  jobTitle(app: JobApplication): string {
    return app.jobOpening?.title ?? 'Job';
  }

  statusLabel(status: ApplicationStatus): string {
    return this.recruitment.statusLabel(status);
  }

  private normalizeColumns(columns: PipelineColumn[]): PipelineColumn[] {
    const byStatus = new Map(columns.map((c) => [c.status, c]));
    return STAGE_ORDER.map((status) => {
      const existing = byStatus.get(status);
      return {
        status,
        label: existing?.label ?? this.statusLabel(status),
        applications: existing?.applications ?? [],
      };
    });
  }
}
