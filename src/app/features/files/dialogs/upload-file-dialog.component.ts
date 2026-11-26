import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { map, startWith } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService } from '../../../core/services/employee.service';
import {
  FILE_CATEGORIES,
  FILE_CATEGORY_LABELS,
  FileCategory,
  FilesService,
} from '../../../core/services/files.service';
import { RecruitmentService } from '../../../core/services/recruitment.service';
import { ToastService } from '../../../core/services/toast.service';
import { ButtonSpinnerDirective } from '../../../shared/button-spinner/button-spinner.directive';
import { guardDirtyDialog } from '../../../core/guards/unsaved-changes.guard';
import {
  PickerValue,
  displayPerson,
  mustPickOption,
  pickedId,
  personSuggestions,
} from '../../../shared/forms/person-picker';

export interface UploadFileDialogData {
  defaultCategory?: FileCategory;
}

@Component({
  selector: 'app-upload-file-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    ButtonSpinnerDirective,
  ],
  templateUrl: './upload-file-dialog.component.html',
  styleUrl: './upload-file-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadFileDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly files = inject(FilesService);
  private readonly employeesApi = inject(EmployeeService);
  private readonly recruitmentApi = inject(RecruitmentService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly dialogRef = inject(MatDialogRef<UploadFileDialogComponent, boolean>);

  constructor() {
    guardDirtyDialog(this.dialogRef, () => (this.form.dirty || !!this.selectedFile()) && !this.saving());

    // Employee documents need an employee, resumes need a candidate; other categories may still attach one.
    this.form.controls.category.valueChanges.pipe(startWith(this.form.controls.category.value)).subscribe((cat) => {
      this.setRequired(this.employee, cat === 'EMPLOYEE_DOCUMENT');
      this.setRequired(this.candidate, cat === 'RESUME');
    });

    // The size limit comes from the server settings; until it arrives only the server enforces it.
    this.files.getSummary().subscribe({
      next: (summary) => this.maxBytes.set(summary.maxUploadBytes),
      error: () => undefined,
    });
  }

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
  readonly dragging = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly fileError = signal<string | null>(null);
  readonly maxBytes = signal<number | null>(null);

  readonly form = this.fb.nonNullable.group({
    category: [this.initialCategory(), Validators.required],
    title: [''],
    description: [''],
  });

  readonly employee = new FormControl<PickerValue>('', { validators: [mustPickOption] });
  readonly candidate = new FormControl<PickerValue>('', { validators: [mustPickOption] });

  readonly employeeOptions = personSuggestions(this.employee, (search) =>
    this.employeesApi.list({ search, page: 1, pageSize: 10 }).pipe(
      map((res) =>
        res.items.map((e) => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`.trim(),
          detail: e.employeeCode,
        })),
      ),
    ),
  );
  readonly candidateOptions = personSuggestions(this.candidate, (search) =>
    this.recruitmentApi.listCandidates({ search, page: 1, pageSize: 10 }).pipe(
      map((res) =>
        res.items.map((c) => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`.trim(),
          detail: c.email,
        })),
      ),
    ),
  );

  readonly displayPerson = displayPerson;

  onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setFile(input.files?.[0] ?? null);
    // Picking the same file again after removing it must still fire a change event.
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.setFile(event.dataTransfer?.files?.[0] ?? null);
  }

  clearFile(): void {
    this.setFile(null);
  }

  formatBytes(n: number): string {
    return this.files.formatBytes(n);
  }

  submit(): void {
    const file = this.selectedFile();
    this.form.markAllAsTouched();
    this.employee.markAsTouched();
    this.candidate.markAsTouched();
    if (!file) {
      this.fileError.set('Choose a file to upload.');
      return;
    }
    if (this.fileError() || this.form.invalid || this.employee.invalid || this.candidate.invalid || this.saving()) {
      return;
    }

    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.files
      .upload(file, {
        category: raw.category,
        title: raw.title.trim() || undefined,
        description: raw.description.trim() || undefined,
        employeeId: this.canAttachEmployee ? pickedId(this.employee.value) : undefined,
        candidateId: this.canAttachCandidate ? pickedId(this.candidate.value) : undefined,
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

  private setFile(file: File | null): void {
    this.selectedFile.set(file);
    const max = this.maxBytes();
    this.fileError.set(
      file && max !== null && file.size > max
        ? `This file is ${this.formatBytes(file.size)}. The limit is ${this.formatBytes(max)}.`
        : null,
    );
  }

  private setRequired(control: FormControl<PickerValue>, required: boolean): void {
    control.setValidators(required ? [Validators.required, mustPickOption] : [mustPickOption]);
    control.updateValueAndValidity({ emitEvent: false });
  }

  private initialCategory(): FileCategory {
    const wanted = this.data?.defaultCategory ?? 'GENERAL';
    return this.categories.includes(wanted) ? wanted : 'GENERAL';
  }
}
