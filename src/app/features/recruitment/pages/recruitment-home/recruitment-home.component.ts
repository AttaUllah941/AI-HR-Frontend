import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrganizationService } from '../../../organization/services/organization.service';
import { Department } from '../../../organization/models/organization.models';
import { RecruitmentApiService } from '../../services/recruitment-api.service';
import {
  Candidate,
  CandidateStage,
  PipelineColumn,
  RecruitmentSummary,
} from '../../models/recruitment.models';

@Component({
  selector: 'app-recruitment-home',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './recruitment-home.component.html',
  styleUrl: './recruitment-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecruitmentHomeComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly recruitmentApi = inject(RecruitmentApiService);
  private readonly orgApi = inject(OrganizationService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly screening = signal(false);
  readonly saving = signal(false);
  readonly showPostJob = signal(false);

  readonly summary = signal<RecruitmentSummary | null>(null);
  readonly columns = signal<PipelineColumn[]>([]);
  readonly departments = signal<Department[]>([]);

  readonly canCreate = computed(() => this.auth.hasPermission('recruitment:create'));
  readonly canUpdate = computed(() => this.auth.hasPermission('recruitment:update'));

  readonly subtitle = computed(() => {
    const s = this.summary();
    if (!s) {
      return 'Hiring pipeline and open roles';
    }
    return `Active pipeline · ${s.openRoles.toLocaleString()} open roles`;
  });

  readonly inFlightLabel = computed(() => {
    const count = this.summary()?.candidatesInFlight ?? 0;
    return `${count.toLocaleString()} candidates in flight`;
  });

  readonly jobForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    departmentId: [''],
    locationLabel: [''],
    openingsCount: [1, [Validators.required, Validators.min(1)]],
  });

  readonly stageOptions: CandidateStage[] = [
    'APPLIED',
    'SCREENING',
    'INTERVIEW',
    'OFFER',
    'HIRED',
    'REJECTED',
  ];

  ngOnInit(): void {
    this.orgApi.listDepartments({ pageSize: 100 }).subscribe({
      next: (data) => this.departments.set(data.items),
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    let pending = 2;
    const done = () => {
      pending -= 1;
      if (pending <= 0) {
        this.loading.set(false);
      }
    };

    this.recruitmentApi.summary().subscribe({
      next: (data) => {
        this.summary.set(data);
        done();
      },
      error: () => done(),
    });

    this.recruitmentApi.pipeline().subscribe({
      next: (data) => {
        this.columns.set(data.columns);
        done();
      },
      error: () => done(),
    });
  }

  togglePostJob(): void {
    this.showPostJob.update((open) => !open);
  }

  submitJob(): void {
    if (this.jobForm.invalid || this.saving()) {
      this.jobForm.markAllAsTouched();
      return;
    }

    const raw = this.jobForm.getRawValue();
    this.saving.set(true);
    this.recruitmentApi
      .createJob({
        title: raw.title,
        departmentId: raw.departmentId || undefined,
        locationLabel: raw.locationLabel || undefined,
        openingsCount: raw.openingsCount,
        status: 'OPEN',
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showPostJob.set(false);
          this.jobForm.reset({ title: '', departmentId: '', locationLabel: '', openingsCount: 1 });
          this.toast.success('Job posted');
          this.reload();
        },
        error: () => this.saving.set(false),
      });
  }

  aiScreen(): void {
    if (this.screening()) {
      return;
    }
    this.screening.set(true);
    this.recruitmentApi.aiScreen().subscribe({
      next: (data) => {
        this.screening.set(false);
        this.toast.success(
          data.screened > 0
            ? `Screened ${data.screened} applied candidate(s)`
            : 'No applied candidates to screen',
        );
        this.reload();
      },
      error: () => this.screening.set(false),
    });
  }

  moveStage(candidate: Candidate, stage: CandidateStage): void {
    if (!this.canUpdate() || candidate.stage === stage) {
      return;
    }
    this.recruitmentApi.updateCandidate(candidate.id, { stage }).subscribe({
      next: () => {
        this.toast.success(`Moved to ${stage.charAt(0) + stage.slice(1).toLowerCase()}`);
        this.reload();
      },
    });
  }
}
