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
import {
  SalaryCalcType,
  SalaryComponent,
  SalaryComponentKind,
  PayrollService,
} from '../../../core/services/payroll.service';
import { ToastService } from '../../../core/services/toast.service';

export interface SalaryComponentFormDialogData {
  component?: SalaryComponent | null;
}

const KIND_OPTIONS: Array<{ value: SalaryComponentKind; label: string }> = [
  { value: 'ALLOWANCE', label: 'Allowance' },
  { value: 'DEDUCTION', label: 'Deduction' },
  { value: 'BONUS', label: 'Bonus' },
  { value: 'TAX', label: 'Tax' },
];

const CALC_OPTIONS: Array<{ value: SalaryCalcType; label: string }> = [
  { value: 'FIXED', label: 'Fixed amount' },
  { value: 'PERCENT_OF_BASIC', label: 'Percent of basic' },
];

@Component({
  selector: 'app-salary-component-form-dialog',
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
  templateUrl: './salary-component-form-dialog.component.html',
  styleUrl: './salary-component-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalaryComponentFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly payroll = inject(PayrollService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<SalaryComponentFormDialogComponent, boolean>);
  readonly data = inject<SalaryComponentFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly kindOptions = KIND_OPTIONS;
  readonly calcOptions = CALC_OPTIONS;

  readonly form = this.fb.nonNullable.group({
    name: [this.data.component?.name ?? '', [Validators.required, Validators.maxLength(150)]],
    code: [this.data.component?.code ?? '', [Validators.required, Validators.maxLength(50)]],
    kind: [this.data.component?.kind ?? ('ALLOWANCE' as SalaryComponentKind), Validators.required],
    calcType: [
      this.data.component?.calcType ?? ('FIXED' as SalaryCalcType),
      Validators.required,
    ],
    defaultValue: [
      this.data.component?.defaultValue ?? 0,
      [Validators.required, Validators.min(0)],
    ],
    isTaxable: [this.data.component?.isTaxable ?? true],
    isActive: [this.data.component?.isActive ?? true],
    description: [this.data.component?.description ?? ''],
  });

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body = {
      ...raw,
      defaultValue: Number(raw.defaultValue),
      description: raw.description.trim() || null,
    };
    const request$ = this.data.component
      ? this.payroll.updateComponent(this.data.component.id, body)
      : this.payroll.createComponent(body);

    request$.subscribe({
      next: () => {
        this.toast.success(
          this.data.component ? 'Salary component updated' : 'Salary component created',
        );
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.error(err.message || 'Unable to save salary component');
      },
    });
  }
}
