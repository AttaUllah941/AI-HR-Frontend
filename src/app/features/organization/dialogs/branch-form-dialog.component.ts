import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Branch, OrganizationService } from '../../../core/services/organization.service';
import { ToastService } from '../../../core/services/toast.service';

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
    MatProgressSpinnerModule,
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
  readonly data = inject<{ branch: Branch | null }>(MAT_DIALOG_DATA);

  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: [this.data.branch?.name ?? '', [Validators.required, Validators.maxLength(150)]],
    code: [this.data.branch?.code ?? '', [Validators.required, Validators.maxLength(50)]],
    city: [this.data.branch?.city ?? ''],
    country: [this.data.branch?.country ?? ''],
    isHeadOffice: [this.data.branch?.isHeadOffice ?? false],
  });

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const request$ = this.data.branch
      ? this.org.updateBranch(this.data.branch.id, raw)
      : this.org.createBranch(raw);

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.branch ? 'Branch updated' : 'Branch created');
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Unable to save branch');
      },
    });
  }
}
