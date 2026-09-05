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
import { EmployeeListItem, EmployeeService } from '../../../core/services/employee.service';
import {
  PerformanceReview,
  PerformanceService,
} from '../../../core/services/performance.service';
import { ToastService } from '../../../core/services/toast.service';

export interface AppraisalRunDialogData {
  employeeId?: string;
  reviewId?: string;
}

@Component({
  selector: 'app-appraisal-run-dialog',
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
  templateUrl: './appraisal-run-dialog.component.html',
  styleUrl: './appraisal-run-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppraisalRunDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ai = inject(AiService);
  private readonly employeesApi = inject(EmployeeService);
  private readonly performance = inject(PerformanceService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<AppraisalRunDialogComponent, AiGeneration | null>);
  readonly data = inject<AppraisalRunDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly saving = signal(false);
  readonly employees = signal<EmployeeListItem[]>([]);
  readonly reviews = signal<PerformanceReview[]>([]);

  readonly form = this.fb.nonNullable.group({
    employeeId: [this.data.employeeId ?? '', Validators.required],
    reviewId: [this.data.reviewId ?? ''],
    periodLabel: [''],
  });

  constructor() {
    this.employeesApi.list({ page: 1, pageSize: 100, sortBy: 'lastName', sortDir: 'asc' }).subscribe({
      next: (res) => this.employees.set(res.items),
      error: () => this.employees.set([]),
    });

    this.form.controls.employeeId.valueChanges.subscribe((employeeId) => {
      this.form.controls.reviewId.setValue('');
      this.loadReviews(employeeId);
    });

    if (this.data.employeeId) {
      this.loadReviews(this.data.employeeId);
    }
  }

  employeeLabel(emp: EmployeeListItem): string {
    return `${emp.firstName} ${emp.lastName} (${emp.employeeCode})`;
  }

  reviewLabel(review: PerformanceReview): string {
    const emp = review.employee
      ? `${review.employee.firstName} ${review.employee.lastName}`
      : 'Employee';
    const cycle = review.cycle?.name ? ` · ${review.cycle.name}` : '';
    return `${emp}${cycle} · ${review.status}`;
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.ai
      .generateAppraisal({
        employeeId: raw.employeeId,
        reviewId: raw.reviewId.trim() || null,
        periodLabel: raw.periodLabel.trim() || null,
      })
      .subscribe({
        next: (generation) => {
          this.toast.success('Appraisal draft generated.');
          this.dialogRef.close(generation);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(
            err?.error?.message || err?.message || 'Appraisal generation failed.',
          );
          this.saving.set(false);
        },
      });
  }

  private loadReviews(employeeId: string): void {
    if (!employeeId) {
      this.reviews.set([]);
      return;
    }
    this.performance.listReviews({ employeeId, page: 1, pageSize: 50 }).subscribe({
      next: (res) => this.reviews.set(res.items),
      error: () => this.reviews.set([]),
    });
  }
}
