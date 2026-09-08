import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { PerformanceService, PromotionRequest } from '../../../core/services/performance.service';
import { EmployeeListItem, EmployeeService } from '../../../core/services/employee.service';
import { Designation, OrganizationService } from '../../../core/services/organization.service';
import { ToastService } from '../../../core/services/toast.service';

export interface PromotionFormDialogData {
  promotion?: PromotionRequest | null;
}

@Component({
  selector: 'app-promotion-form-dialog',
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
  templateUrl: './promotion-form-dialog.component.html',
  styleUrl: './promotion-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PerformanceService);
  private readonly employeesApi = inject(EmployeeService);
  private readonly org = inject(OrganizationService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<PromotionFormDialogComponent, boolean>);
  readonly data = inject<PromotionFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly isEdit = !!this.data.promotion;
  readonly employees = signal<EmployeeListItem[]>([]);
  readonly designations = signal<Designation[]>([]);

  readonly form = this.fb.nonNullable.group({
    employeeId: [this.data.promotion?.employeeId ?? '', Validators.required],
    proposedDesignationId: [this.data.promotion?.proposedDesignationId ?? ''],
    proposedTitle: [this.data.promotion?.proposedTitle ?? ''],
    reason: [this.data.promotion?.reason ?? '', [Validators.required, Validators.maxLength(5000)]],
    effectiveDate: [this.toDateInput(this.data.promotion?.effectiveDate)],
  });

  constructor() {
    this.employeesApi.list({ page: 1, pageSize: 100, sortBy: 'lastName', sortDir: 'asc' }).subscribe({
      next: (res) => this.employees.set(res.items),
      error: () => this.employees.set([]),
    });
    this.org.listDesignations().subscribe({
      next: (items) => this.designations.set(items),
      error: () => this.designations.set([]),
    });
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
    const body: Record<string, unknown> = {
      proposedDesignationId: raw.proposedDesignationId || null,
      proposedTitle: raw.proposedTitle.trim() || null,
      reason: raw.reason.trim(),
      effectiveDate: raw.effectiveDate ? new Date(raw.effectiveDate).toISOString() : null,
    };
    if (!this.isEdit) {
      body['employeeId'] = raw.employeeId;
    }

    const request$ = this.data.promotion
      ? this.api.updatePromotion(this.data.promotion.id, body)
      : this.api.createPromotion(body);

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.promotion ? 'Promotion updated' : 'Promotion created');
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.error(err.message || 'Unable to save promotion');
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
