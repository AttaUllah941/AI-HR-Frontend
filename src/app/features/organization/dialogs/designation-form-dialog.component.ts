import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Designation, OrganizationService } from '../../../core/services/organization.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-designation-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './designation-form-dialog.component.html',
  styleUrl: './designation-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignationFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly org = inject(OrganizationService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<DesignationFormDialogComponent, boolean>);
  readonly data = inject<{ designation: Designation | null }>(MAT_DIALOG_DATA);

  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: [this.data.designation?.name ?? '', [Validators.required, Validators.maxLength(150)]],
    code: [this.data.designation?.code ?? '', [Validators.required, Validators.maxLength(50)]],
    level: [this.data.designation?.level ?? 1, [Validators.required, Validators.min(1), Validators.max(100)]],
    description: [this.data.designation?.description ?? ''],
  });

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body = {
      name: raw.name,
      code: raw.code,
      level: Number(raw.level),
      description: raw.description || null,
    };
    const request$ = this.data.designation
      ? this.org.updateDesignation(this.data.designation.id, body)
      : this.org.createDesignation(body);

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.designation ? 'Designation updated' : 'Designation created');
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Unable to save designation');
      },
    });
  }
}
