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

export interface ResumeAttachDialogData {
  candidate: Candidate;
}

@Component({
  selector: 'app-resume-attach-dialog',
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
  templateUrl: './resume-attach-dialog.component.html',
  styleUrl: './resume-attach-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumeAttachDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly recruitment = inject(RecruitmentService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<ResumeAttachDialogComponent, boolean>);
  readonly data = inject<ResumeAttachDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    resumeUrl: [this.data.candidate.resumeUrl ?? '', [Validators.required, Validators.maxLength(1000)]],
    resumeFileName: [this.data.candidate.resumeFileName ?? ''],
    resumeMimeType: [this.data.candidate.resumeMimeType ?? ''],
  });

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.recruitment
      .attachResume(this.data.candidate.id, {
        resumeUrl: raw.resumeUrl.trim(),
        resumeFileName: raw.resumeFileName.trim() || null,
        resumeMimeType: raw.resumeMimeType.trim() || null,
      })
      .subscribe({
        next: () => {
          this.toast.success('Resume attached');
          this.dialogRef.close(true);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.toast.error(err.message || 'Unable to attach resume');
        },
      });
  }
}
