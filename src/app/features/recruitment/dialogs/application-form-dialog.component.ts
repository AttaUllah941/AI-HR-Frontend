import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  Candidate,
  JobOpening,
  RecruitmentService,
} from '../../../core/services/recruitment.service';
import { ToastService } from '../../../core/services/toast.service';

export interface ApplicationFormDialogData {
  jobOpeningId?: string;
  candidateId?: string;
}

@Component({
  selector: 'app-application-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './application-form-dialog.component.html',
  styleUrl: './application-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly recruitment = inject(RecruitmentService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<ApplicationFormDialogComponent, boolean>);
  readonly data = inject<ApplicationFormDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly saving = signal(false);
  readonly jobs = signal<JobOpening[]>([]);
  readonly candidates = signal<Candidate[]>([]);

  readonly form = this.fb.nonNullable.group({
    jobOpeningId: [this.data.jobOpeningId ?? '', Validators.required],
    candidateId: [this.data.candidateId ?? '', Validators.required],
    coverLetter: [''],
  });

  constructor() {
    this.recruitment.listJobs({ status: 'OPEN', page: 1, pageSize: 100 }).subscribe({
      next: (res) => this.jobs.set(res.items),
      error: () => this.jobs.set([]),
    });
    this.recruitment.listCandidates({ page: 1, pageSize: 100 }).subscribe({
      next: (res) => this.candidates.set(res.items),
      error: () => this.candidates.set([]),
    });
  }

  candidateLabel(c: Candidate): string {
    return `${c.firstName} ${c.lastName} (${c.email})`;
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.recruitment
      .createApplication({
        jobOpeningId: raw.jobOpeningId,
        candidateId: raw.candidateId,
        coverLetter: raw.coverLetter.trim() || null,
      })
      .subscribe({
        next: () => {
          this.toast.success('Application created');
          this.dialogRef.close(true);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.toast.error(err.message || 'Unable to create application');
        },
      });
  }
}
