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
  PerformanceReview,
  PerformanceService,
  ReviewCycle,
} from '../../../core/services/performance.service';
import { EmployeeListItem, EmployeeService } from '../../../core/services/employee.service';
import { ToastService } from '../../../core/services/toast.service';

export interface ReviewFormDialogData {
  review?: PerformanceReview | null;
  cycles?: ReviewCycle[];
}

@Component({
  selector: 'app-review-form-dialog',
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
  templateUrl: './review-form-dialog.component.html',
  styleUrl: './review-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PerformanceService);
  private readonly employeesApi = inject(EmployeeService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<ReviewFormDialogComponent, boolean>);
  readonly data = inject<ReviewFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly isEdit = !!this.data.review;
  readonly employees = signal<EmployeeListItem[]>([]);
  readonly cycles = signal<ReviewCycle[]>(this.data.cycles ?? []);

  readonly form = this.fb.nonNullable.group({
    employeeId: [this.data.review?.employeeId ?? '', Validators.required],
    reviewerId: [this.data.review?.reviewerId ?? ''],
    cycleId: [this.data.review?.cycleId ?? ''],
    selfRating: [this.data.review?.selfRating ?? null as number | null],
    managerRating: [this.data.review?.managerRating ?? null as number | null],
    overallRating: [this.data.review?.overallRating ?? null as number | null],
    selfComments: [this.data.review?.selfComments ?? ''],
    managerComments: [this.data.review?.managerComments ?? ''],
  });

  constructor() {
    this.employeesApi.list({ page: 1, pageSize: 100, sortBy: 'lastName', sortDir: 'asc' }).subscribe({
      next: (res) => this.employees.set(res.items),
      error: () => this.employees.set([]),
    });
    if (!this.data.cycles?.length) {
      this.api.listCycles({ page: 1, pageSize: 50 }).subscribe({
        next: (res) => this.cycles.set(Array.isArray(res) ? res : res.items),
        error: () => this.cycles.set([]),
      });
    }
    if (this.isEdit) {
      this.form.controls.employeeId.disable();
    }
  }

  employeeLabel(emp: EmployeeListItem): string {
    return `${emp.firstName} ${emp.lastName} (${emp.employeeCode})`;
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const numOrNull = (v: number | null) =>
      v === null || v === ('' as unknown) ? null : Number(v);

    const body: Record<string, unknown> = {
      reviewerId: raw.reviewerId || null,
      cycleId: raw.cycleId || null,
      selfRating: numOrNull(raw.selfRating),
      managerRating: numOrNull(raw.managerRating),
      overallRating: numOrNull(raw.overallRating),
      selfComments: raw.selfComments.trim() || null,
      managerComments: raw.managerComments.trim() || null,
    };
    if (!this.isEdit) {
      body['employeeId'] = raw.employeeId;
    }

    const request$ = this.data.review
      ? this.api.updateReview(this.data.review.id, body)
      : this.api.createReview(body);

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.review ? 'Review updated' : 'Review created');
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.error(err.message || 'Unable to save review');
      },
    });
  }
}
