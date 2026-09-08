import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PerformanceKpi, PerformanceService } from '../../../core/services/performance.service';
import { ToastService } from '../../../core/services/toast.service';

export interface KpiFormDialogData {
  kpi?: PerformanceKpi | null;
}

@Component({
  selector: 'app-kpi-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './kpi-form-dialog.component.html',
  styleUrl: './kpi-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PerformanceService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<KpiFormDialogComponent, boolean>);
  readonly data = inject<KpiFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly isEdit = !!this.data.kpi;

  readonly form = this.fb.nonNullable.group({
    name: [this.data.kpi?.name ?? '', [Validators.required, Validators.maxLength(150)]],
    code: [this.data.kpi?.code ?? '', [Validators.required, Validators.maxLength(50)]],
    description: [this.data.kpi?.description ?? ''],
    unit: [this.data.kpi?.unit ?? ''],
    targetDefault: [this.data.kpi?.targetDefault ?? null as number | null],
    isActive: [this.data.kpi?.isActive ?? true],
  });

  constructor() {
    if (this.isEdit) {
      this.form.controls.code.disable();
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body: Record<string, unknown> = {
      name: raw.name.trim(),
      code: raw.code.trim(),
      description: raw.description.trim() || null,
      unit: raw.unit.trim() || null,
      targetDefault:
        raw.targetDefault === null || raw.targetDefault === ('' as unknown)
          ? null
          : Number(raw.targetDefault),
      isActive: raw.isActive,
    };

    const request$ = this.data.kpi
      ? this.api.updateKpi(this.data.kpi.id, body)
      : this.api.createKpi(body);

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.kpi ? 'KPI updated' : 'KPI created');
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.error(err.message || 'Unable to save KPI');
      },
    });
  }
}
