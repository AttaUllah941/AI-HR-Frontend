import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LeaveService, LeaveType } from '../../../core/services/leave.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-leave-type-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './leave-type-form-dialog.component.html',
  styleUrl: './leave-type-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveTypeFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly leave = inject(LeaveService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<LeaveTypeFormDialogComponent, boolean>);
  readonly data = inject<{ leaveType: LeaveType | null }>(MAT_DIALOG_DATA);

  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: [this.data.leaveType?.name ?? '', [Validators.required, Validators.maxLength(150)]],
    code: [this.data.leaveType?.code ?? '', [Validators.required, Validators.maxLength(50)]],
    description: [this.data.leaveType?.description ?? ''],
    color: [
      this.data.leaveType?.color ?? '#3b82f6',
      [Validators.required, Validators.pattern(/^#([0-9a-fA-F]{6})$/)],
    ],
    isPaid: [this.data.leaveType?.isPaid ?? true],
    requiresApproval: [this.data.leaveType?.requiresApproval ?? true],
    allowHalfDay: [this.data.leaveType?.allowHalfDay ?? true],
    maxDaysPerYear: [
      this.data.leaveType?.maxDaysPerYear ?? 0,
      [Validators.required, Validators.min(0), Validators.max(365)],
    ],
    carryForwardDays: [
      this.data.leaveType?.carryForwardDays ?? 0,
      [Validators.required, Validators.min(0), Validators.max(365)],
    ],
    isActive: [this.data.leaveType?.isActive ?? true],
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
      description: raw.description.trim() || null,
      maxDaysPerYear: Number(raw.maxDaysPerYear),
      carryForwardDays: Number(raw.carryForwardDays),
    };
    const request$ = this.data.leaveType
      ? this.leave.updateType(this.data.leaveType.id, body)
      : this.leave.createType(body);

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.leaveType ? 'Leave type updated' : 'Leave type created');
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.error(err.message || 'Unable to save leave type');
      },
    });
  }
}
