import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { PayrollRun, PayrollService } from '../../../core/services/payroll.service';
import { ToastService } from '../../../core/services/toast.service';

export interface PayrollRunFormDialogData {
  run?: PayrollRun | null;
}

@Component({
  selector: 'app-payroll-run-form-dialog',
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
  templateUrl: './payroll-run-form-dialog.component.html',
  styleUrl: './payroll-run-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollRunFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly payroll = inject(PayrollService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<PayrollRunFormDialogComponent, boolean>);
  readonly data = inject<PayrollRunFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly isEdit = !!this.data.run;
  readonly currentYear = new Date().getFullYear();
  readonly yearOptions = [this.currentYear - 1, this.currentYear, this.currentYear + 1];
  readonly monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: this.payroll.monthLabel(i + 1),
  }));

  readonly form = this.fb.nonNullable.group({
    year: [
      this.data.run?.year ?? this.currentYear,
      [Validators.required, Validators.min(2000), Validators.max(2100)],
    ],
    month: [
      this.data.run?.month ?? new Date().getMonth() + 1,
      [Validators.required, Validators.min(1), Validators.max(12)],
    ],
    title: [this.data.run?.title ?? '', [Validators.maxLength(200)]],
    notes: [this.data.run?.notes ?? ''],
  });

  constructor() {
    if (this.isEdit) {
      this.form.controls.year.disable();
      this.form.controls.month.disable();
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body = {
      year: Number(raw.year),
      month: Number(raw.month),
      title: raw.title.trim() || undefined,
      notes: raw.notes.trim() || null,
    };

    const request$ = this.data.run
      ? this.payroll.updateRun(this.data.run.id, {
          title: body.title,
          notes: body.notes,
        })
      : this.payroll.createRun(body);

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.run ? 'Payroll run updated' : 'Payroll run created');
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.error(err.message || 'Unable to save payroll run');
      },
    });
  }
}
