import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Branch, OrganizationService } from '../../../core/services/organization.service';
import { ToastService } from '../../../core/services/toast.service';
import { ButtonSpinnerDirective } from '../../../shared/button-spinner/button-spinner.directive';
import { guardDirtyDialog } from '../../../core/guards/unsaved-changes.guard';

@Component({
  selector: 'app-branch-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    ButtonSpinnerDirective,
  ],
  templateUrl: './branch-form-dialog.component.html',
  styleUrl: './branch-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly org = inject(OrganizationService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<BranchFormDialogComponent, boolean>);

  constructor() {
    guardDirtyDialog(this.dialogRef, () => this.form.dirty && !this.saving());
  }
  readonly data = inject<{ branch: Branch | null }>(MAT_DIALOG_DATA);

  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: [this.data.branch?.name ?? '', [Validators.required, Validators.maxLength(150)]],
    code: [this.data.branch?.code ?? '', [Validators.required, Validators.maxLength(50)]],
    city: [this.data.branch?.city ?? ''],
    country: [this.data.branch?.country ?? ''],
    isHeadOffice: [this.data.branch?.isHeadOffice ?? false],
    isActive: [this.data.branch?.isActive ?? true],
    allowedIpsText: [
      this.data.branch?.allowedIps?.map((ip) => ip.cidr).join('\n') ?? '',
    ],
  });

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const payload = {
      name: raw.name,
      code: raw.code,
      city: raw.city,
      country: raw.country,
      isHeadOffice: raw.isHeadOffice,
      isActive: raw.isActive,
      allowedIps: raw.allowedIpsText
        .split(/[\n,]+/)
        .map((ip) => ip.trim())
        .filter(Boolean),
    };
    const request$ = this.data.branch
      ? this.org.updateBranch(this.data.branch.id, payload)
      : this.org.createBranch(payload);

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.branch ? 'Branch updated' : 'Branch created');
        this.dialogRef.close(true);
      },
      error: (err: { error?: { message?: string } }) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message || 'Unable to save branch');
      },
    });
  }
}

