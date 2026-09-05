import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Interview, RecruitmentService } from '../../../core/services/recruitment.service';
import { ToastService } from '../../../core/services/toast.service';

export interface InterviewCompleteDialogData {
  interview: Interview;
}

@Component({
  selector: 'app-interview-complete-dialog',
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
  templateUrl: './interview-complete-dialog.component.html',
  styleUrl: './interview-complete-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterviewCompleteDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly recruitment = inject(RecruitmentService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<InterviewCompleteDialogComponent, boolean>);
  readonly data = inject<InterviewCompleteDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly statusOptions = [
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'NO_SHOW', label: 'No show' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ] as const;

  readonly form = this.fb.nonNullable.group({
    status: ['COMPLETED' as 'COMPLETED' | 'NO_SHOW' | 'CANCELLED', Validators.required],
    rating: [this.data.interview.rating ?? null as number | null, [Validators.min(0), Validators.max(5)]],
    feedback: [this.data.interview.feedback ?? ''],
  });

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.recruitment
      .completeInterview(this.data.interview.id, {
        status: raw.status,
        rating:
          raw.rating === null || raw.rating === ('' as unknown) ? null : Number(raw.rating),
        feedback: raw.feedback.trim() || null,
      })
      .subscribe({
        next: () => {
          this.toast.success('Interview marked complete');
          this.dialogRef.close(true);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.toast.error(err.message || 'Unable to complete interview');
        },
      });
  }
}
