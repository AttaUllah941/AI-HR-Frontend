import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { FeedbackType, PerformanceService } from '../../../core/services/performance.service';
import { EmployeeListItem, EmployeeService } from '../../../core/services/employee.service';
import { ToastService } from '../../../core/services/toast.service';

export interface FeedbackFormDialogData {
  toEmployeeId?: string;
}

@Component({
  selector: 'app-feedback-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './feedback-form-dialog.component.html',
  styleUrl: './feedback-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedbackFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PerformanceService);
  private readonly employeesApi = inject(EmployeeService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<FeedbackFormDialogComponent, boolean>);
  readonly data = inject<FeedbackFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly employees = signal<EmployeeListItem[]>([]);
  readonly types: FeedbackType[] = ['PEER', 'MANAGER', 'SELF', 'UPWARD', 'GENERAL'];

  readonly form = this.fb.nonNullable.group({
    toEmployeeId: [this.data.toEmployeeId ?? '', Validators.required],
    type: ['GENERAL' as FeedbackType],
    rating: [null as number | null],
    content: ['', [Validators.required, Validators.maxLength(5000)]],
    isAnonymous: [false],
  });

  constructor() {
    this.employeesApi.list({ page: 1, pageSize: 100, sortBy: 'lastName', sortDir: 'asc' }).subscribe({
      next: (res) => this.employees.set(res.items),
      error: () => this.employees.set([]),
    });
  }

  employeeLabel(emp: EmployeeListItem): string {
    return `${emp.firstName} ${emp.lastName} (${emp.employeeCode})`;
  }

  typeLabel(type: FeedbackType): string {
    return this.api.statusLabel(type);
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body = {
      toEmployeeId: raw.toEmployeeId,
      type: raw.type,
      rating: raw.rating === null || raw.rating === ('' as unknown) ? null : Number(raw.rating),
      content: raw.content.trim(),
      isAnonymous: raw.isAnonymous,
    };

    this.api.createFeedback(body).subscribe({
      next: () => {
        this.toast.success('Feedback submitted');
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.error(err.message || 'Unable to submit feedback');
      },
    });
  }
}
