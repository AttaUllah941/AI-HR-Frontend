import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PerformanceService, ReviewCycle } from '../../../core/services/performance.service';
import { ToastService } from '../../../core/services/toast.service';

export interface ReviewCycleFormDialogData {
  cycle?: ReviewCycle | null;
  year?: number;
}

@Component({
  selector: 'app-review-cycle-form-dialog',
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
  templateUrl: './review-cycle-form-dialog.component.html',
  styleUrl: './review-cycle-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewCycleFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PerformanceService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<ReviewCycleFormDialogComponent, boolean>);
  readonly data = inject<ReviewCycleFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly isEdit = !!this.data.cycle;
  readonly year = this.data.cycle?.year ?? this.data.year ?? new Date().getFullYear();

  readonly form = this.fb.nonNullable.group({
    name: [this.data.cycle?.name ?? '', [Validators.required, Validators.maxLength(200)]],
    year: [this.year, [Validators.required, Validators.min(2000), Validators.max(2100)]],
    startDate: [this.toDateInput(this.data.cycle?.startDate), Validators.required],
    endDate: [this.toDateInput(this.data.cycle?.endDate), Validators.required],
  });

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body = {
      name: raw.name.trim(),
      year: Number(raw.year),
      startDate: new Date(raw.startDate).toISOString(),
      endDate: new Date(raw.endDate).toISOString(),
    };

    const request$ = this.data.cycle
      ? this.api.updateCycle(this.data.cycle.id, body)
      : this.api.createCycle(body);

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.cycle ? 'Cycle updated' : 'Cycle created');
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.error(err.message || 'Unable to save cycle');
      },
    });
  }

  private toDateInput(value?: string | null): string {
    if (!value) {
      return '';
    }
    return value.slice(0, 10);
  }
}
