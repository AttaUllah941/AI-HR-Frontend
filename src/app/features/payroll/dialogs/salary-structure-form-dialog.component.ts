import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  PayrollService,
  SalaryComponent,
  SalaryStructure,
} from '../../../core/services/payroll.service';
import { EmployeeListItem, EmployeeService } from '../../../core/services/employee.service';
import { ToastService } from '../../../core/services/toast.service';

export interface SalaryStructureFormDialogData {
  structure?: SalaryStructure | null;
}

@Component({
  selector: 'app-salary-structure-form-dialog',
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
  templateUrl: './salary-structure-form-dialog.component.html',
  styleUrl: './salary-structure-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalaryStructureFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly payroll = inject(PayrollService);
  private readonly employeesApi = inject(EmployeeService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<SalaryStructureFormDialogComponent, boolean>);
  readonly data = inject<SalaryStructureFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly employees = signal<EmployeeListItem[]>([]);
  readonly components = signal<SalaryComponent[]>([]);
  readonly isEdit = !!this.data.structure;

  readonly form = this.fb.nonNullable.group({
    employeeId: [this.data.structure?.employeeId ?? '', Validators.required],
    basicSalary: [
      this.data.structure?.basicSalary ?? 0,
      [Validators.required, Validators.min(0)],
    ],
    currency: [this.data.structure?.currency ?? 'USD', [Validators.required, Validators.maxLength(10)]],
    effectiveFrom: [
      this.toDateInput(this.data.structure?.effectiveFrom) || this.todayInput(),
      Validators.required,
    ],
    effectiveTo: [this.toDateInput(this.data.structure?.effectiveTo)],
    bankName: [this.data.structure?.bankName ?? ''],
    bankAccount: [this.data.structure?.bankAccount ?? ''],
    bankIban: [this.data.structure?.bankIban ?? ''],
    notes: [this.data.structure?.notes ?? ''],
    isActive: [this.data.structure?.isActive ?? true],
    components: this.fb.array(
      (this.data.structure?.components ?? []).map((row) =>
        this.fb.nonNullable.group({
          componentId: [row.componentId, Validators.required],
          value: [row.value, [Validators.required, Validators.min(0)]],
        }),
      ),
    ),
  });

  get componentRows(): FormArray {
    return this.form.controls.components as FormArray;
  }

  constructor() {
    this.employeesApi.list({ page: 1, pageSize: 100, sortBy: 'lastName', sortDir: 'asc' }).subscribe({
      next: (res) => this.employees.set(res.items),
    });
    this.payroll.listComponents().subscribe({
      next: (items) => this.components.set(items.filter((c) => c.isActive)),
    });

    if (this.isEdit) {
      this.form.controls.employeeId.disable();
    }
  }

  addComponentRow(): void {
    this.componentRows.push(
      this.fb.nonNullable.group({
        componentId: ['', Validators.required],
        value: [0, [Validators.required, Validators.min(0)]],
      }),
    );
  }

  removeComponentRow(index: number): void {
    this.componentRows.removeAt(index);
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body = {
      employeeId: raw.employeeId,
      basicSalary: Number(raw.basicSalary),
      currency: raw.currency.trim() || 'USD',
      effectiveFrom: raw.effectiveFrom,
      effectiveTo: raw.effectiveTo || null,
      bankName: raw.bankName.trim() || null,
      bankAccount: raw.bankAccount.trim() || null,
      bankIban: raw.bankIban.trim() || null,
      notes: raw.notes.trim() || null,
      isActive: raw.isActive,
      components: raw.components.map((row) => ({
        componentId: row.componentId,
        value: Number(row.value),
      })),
    };

    const request$ = this.data.structure
      ? this.payroll.updateStructure(this.data.structure.id, {
          basicSalary: body.basicSalary,
          currency: body.currency,
          effectiveFrom: body.effectiveFrom,
          effectiveTo: body.effectiveTo,
          bankName: body.bankName,
          bankAccount: body.bankAccount,
          bankIban: body.bankIban,
          notes: body.notes,
          isActive: body.isActive,
          components: body.components,
        })
      : this.payroll.createStructure(body);

    request$.subscribe({
      next: () => {
        this.toast.success(
          this.data.structure ? 'Salary structure updated' : 'Salary structure created',
        );
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.error(err.message || 'Unable to save salary structure');
      },
    });
  }

  private toDateInput(value?: string | null): string {
    if (!value) {
      return '';
    }
    return value.slice(0, 10);
  }

  private todayInput(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }
}
