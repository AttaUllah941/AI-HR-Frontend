import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AiGeneration, AiService } from '../../../core/services/ai.service';
import {
  Candidate,
  JobOpening,
  RecruitmentService,
} from '../../../core/services/recruitment.service';
import { ToastService } from '../../../core/services/toast.service';

export interface ScreeningRunDialogData {
  candidateId?: string;
  jobOpeningId?: string;
}

@Component({
  selector: 'app-screening-run-dialog',
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
  templateUrl: './screening-run-dialog.component.html',
  styleUrl: './screening-run-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScreeningRunDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ai = inject(AiService);
  private readonly recruitment = inject(RecruitmentService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<ScreeningRunDialogComponent, AiGeneration | null>);
  readonly data = inject<ScreeningRunDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly saving = signal(false);
  readonly candidates = signal<Candidate[]>([]);
  readonly jobs = signal<JobOpening[]>([]);

  readonly form = this.fb.nonNullable.group({
    candidateId: [this.data.candidateId ?? '', Validators.required],
    jobOpeningId: [this.data.jobOpeningId ?? ''],
    notes: [''],
  });

  constructor() {
    this.recruitment.listCandidates({ page: 1, pageSize: 100 }).subscribe({
      next: (res) => this.candidates.set(res.items),
      error: () => this.candidates.set([]),
    });
    this.recruitment.listJobs({ page: 1, pageSize: 100 }).subscribe({
      next: (res) => this.jobs.set(res.items),
      error: () => this.jobs.set([]),
    });
  }

  candidateLabel(c: Candidate): string {
    return `${c.firstName} ${c.lastName}${c.email ? ` · ${c.email}` : ''}`;
  }

  jobLabel(j: JobOpening): string {
    return `${j.title} (${j.code})`;
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.ai
      .screenResume({
        candidateId: raw.candidateId,
        jobOpeningId: raw.jobOpeningId.trim() || null,
        notes: raw.notes.trim() || null,
      })
      .subscribe({
        next: (generation) => {
          this.toast.success('Resume screening complete.');
          this.dialogRef.close(generation);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(
            err?.error?.message || err?.message || 'Screening failed. Please try again.',
          );
          this.saving.set(false);
        },
      });
  }
}
