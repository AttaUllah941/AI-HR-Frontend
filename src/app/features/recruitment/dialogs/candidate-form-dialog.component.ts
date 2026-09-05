import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Candidate, RecruitmentService } from '../../../core/services/recruitment.service';
import { ToastService } from '../../../core/services/toast.service';

export interface CandidateFormDialogData {
  candidate?: Candidate | null;
}

@Component({
  selector: 'app-candidate-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './candidate-form-dialog.component.html',
  styleUrl: './candidate-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly recruitment = inject(RecruitmentService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<CandidateFormDialogComponent, boolean>);
  readonly data = inject<CandidateFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly isEdit = !!this.data.candidate;

  readonly form = this.fb.nonNullable.group({
    firstName: [this.data.candidate?.firstName ?? '', [Validators.required, Validators.maxLength(100)]],
    lastName: [this.data.candidate?.lastName ?? '', [Validators.required, Validators.maxLength(100)]],
    email: [this.data.candidate?.email ?? '', [Validators.required, Validators.email]],
    phone: [this.data.candidate?.phone ?? ''],
    source: [this.data.candidate?.source ?? ''],
    currentTitle: [this.data.candidate?.currentTitle ?? ''],
    currentCompany: [this.data.candidate?.currentCompany ?? ''],
    yearsExperience: [this.data.candidate?.yearsExperience ?? null as number | null],
    linkedinUrl: [this.data.candidate?.linkedinUrl ?? ''],
    portfolioUrl: [this.data.candidate?.portfolioUrl ?? ''],
    notes: [this.data.candidate?.notes ?? ''],
  });

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body: Record<string, unknown> = {
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      email: raw.email.trim(),
      phone: raw.phone.trim() || null,
      source: raw.source.trim() || null,
      currentTitle: raw.currentTitle.trim() || null,
      currentCompany: raw.currentCompany.trim() || null,
      yearsExperience:
        raw.yearsExperience === null || raw.yearsExperience === ('' as unknown)
          ? null
          : Number(raw.yearsExperience),
      linkedinUrl: raw.linkedinUrl.trim() || null,
      portfolioUrl: raw.portfolioUrl.trim() || null,
      notes: raw.notes.trim() || null,
    };

    const request$ = this.data.candidate
      ? this.recruitment.updateCandidate(this.data.candidate.id, body)
      : this.recruitment.createCandidate(body);

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.candidate ? 'Candidate updated' : 'Candidate created');
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.error(err.message || 'Unable to save candidate');
      },
    });
  }
}
