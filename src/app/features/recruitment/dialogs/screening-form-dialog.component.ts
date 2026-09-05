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

export interface ScreeningFormDialogData {
  candidate: Candidate;
}

@Component({
  selector: 'app-screening-form-dialog',
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
  templateUrl: './screening-form-dialog.component.html',
  styleUrl: './screening-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScreeningFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly recruitment = inject(RecruitmentService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<ScreeningFormDialogComponent, boolean>);
  readonly data = inject<ScreeningFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    screeningScore: [
      this.data.candidate.screeningScore ?? 0,
      [Validators.required, Validators.min(0), Validators.max(100)],
    ],
    screeningNotes: [this.data.candidate.screeningNotes ?? ''],
  });

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.recruitment
      .updateScreening(this.data.candidate.id, {
        screeningScore: Number(raw.screeningScore),
        screeningNotes: raw.screeningNotes.trim() || null,
      })
      .subscribe({
        next: () => {
          this.toast.success('Screening updated');
          this.dialogRef.close(true);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.toast.error(err.message || 'Unable to update screening');
        },
      });
  }
}
