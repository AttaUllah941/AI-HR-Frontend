import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../../core/services/auth.service';
import {
  FILE_CATEGORIES,
  FILE_CATEGORY_LABELS,
  FileCategory,
  FilesService,
} from '../../../core/services/files.service';
import { ToastService } from '../../../core/services/toast.service';

export interface UploadFileDialogData {
  defaultCategory?: FileCategory;
}

@Component({
  selector: 'app-upload-file-dialog',
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
  templateUrl: './upload-file-dialog.component.html',
  styleUrl: './upload-file-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadFileDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly files = inject(FilesService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly dialogRef = inject(MatDialogRef<UploadFileDialogComponent, boolean>);
  readonly data = inject<UploadFileDialogData>(MAT_DIALOG_DATA, { optional: true });

  /** Attaching to an employee or candidate needs write access to that record type. */
  readonly canAttachEmployee = this.auth.hasPermission('employees:update');
  readonly canAttachCandidate = this.auth.hasPermission('recruitment:update');
  readonly categories = FILE_CATEGORIES.filter(
    (cat) =>
      (cat !== 'EMPLOYEE_DOCUMENT' || this.canAttachEmployee) &&
      (cat !== 'RESUME' || this.canAttachCandidate),
  );
  readonly categoryLabels = FILE_CATEGORY_LABELS;
  readonly saving = signal(false);
  readonly selectedFile = signal<File | null>(null);

  readonly form = this.fb.nonNullable.group({
    category: [this.initialCategory(), Validators.required],
    title: [''],
    description: [''],
    employeeId: [''],
    candidateId: [''],
  });

  private initialCategory(): FileCategory {
    const wanted = this.data?.defaultCategory ?? 'GENERAL';
    return this.categories.includes(wanted) ? wanted : 'GENERAL';
  }

  onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
  }

  submit(): void {
    const file = this.selectedFile();
    if (!file || this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      if (!file) this.toast.error('Choose a file to upload.');
      return;
    }

    const raw = this.form.getRawValue();
    if (raw.category === 'EMPLOYEE_DOCUMENT' && !raw.employeeId.trim()) {
      this.toast.error('Employee ID is required for employee documents.');
      return;
    }
    if (raw.category === 'RESUME' && !raw.candidateId.trim()) {
      this.toast.error('Candidate ID is required for resumes.');
      return;
    }

    this.saving.set(true);
    this.files
      .upload(file, {
        category: raw.category,
        title: raw.title.trim() || undefined,
        description: raw.description.trim() || undefined,
        employeeId: (this.canAttachEmployee && raw.employeeId.trim()) || undefined,
        candidateId: (this.canAttachCandidate && raw.candidateId.trim()) || undefined,
      })
      .subscribe({
        next: () => {
          this.toast.success('File uploaded.');
          this.dialogRef.close(true);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(err?.error?.message || err?.message || 'Upload failed.');
          this.saving.set(false);
        },
      });
  }
}
