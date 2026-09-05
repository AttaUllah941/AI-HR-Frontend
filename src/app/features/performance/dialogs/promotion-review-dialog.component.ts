import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PerformanceService, PromotionRequest } from '../../../core/services/performance.service';
import { ToastService } from '../../../core/services/toast.service';

export interface PromotionReviewDialogData {
  promotion: PromotionRequest;
  approve: boolean;
}

@Component({
  selector: 'app-promotion-review-dialog',
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
  templateUrl: './promotion-review-dialog.component.html',
  styleUrl: './promotion-review-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionReviewDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PerformanceService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<PromotionReviewDialogComponent, boolean>);
  readonly data = inject<PromotionReviewDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly approve = this.data.approve;

  readonly form = this.fb.nonNullable.group({
    reviewNotes: [''],
    effectiveDate: [this.toDateInput(this.data.promotion.effectiveDate)],
  });

  submit(): void {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.api
      .reviewPromotion(this.data.promotion.id, {
        approve: this.approve,
        reviewNotes: raw.reviewNotes.trim() || null,
        effectiveDate: raw.effectiveDate ? new Date(raw.effectiveDate).toISOString() : null,
      })
      .subscribe({
        next: () => {
          this.toast.success(this.approve ? 'Promotion approved' : 'Promotion rejected');
          this.dialogRef.close(true);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.toast.error(err.message || 'Unable to review promotion');
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
