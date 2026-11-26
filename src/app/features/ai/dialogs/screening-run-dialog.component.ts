import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { map } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AiGeneration, AiService } from '../../../core/services/ai.service';
import {
  JobOpening,
  RecruitmentService,
} from '../../../core/services/recruitment.service';
import { ToastService } from '../../../core/services/toast.service';
import { SmartLoaderComponent } from '../../../shared/smart-loader/smart-loader.component';
import { LOADER_MESSAGES } from '../../../shared/smart-loader/loader-messages';
import { ButtonSpinnerDirective } from '../../../shared/button-spinner/button-spinner.directive';
import { guardDirtyDialog } from '../../../core/guards/unsaved-changes.guard';
import {
  PersonOption,
  PickerValue,
  displayPerson,
  mustPickOption,
  pickedId,
  personSuggestions,
} from '../../../shared/forms/person-picker';

export interface ScreeningRunDialogData {
  candidateId?: string;
  jobOpeningId?: string;
}

@Component({
  selector: 'app-screening-run-dialog',
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
    SmartLoaderComponent,
    ButtonSpinnerDirective,
  ],
  templateUrl: './screening-run-dialog.component.html',
  styleUrl: './screening-run-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScreeningRunDialogComponent {
  protected readonly resumeMessages = LOADER_MESSAGES.resume;
  private readonly fb = inject(FormBuilder);
  private readonly ai = inject(AiService);
  private readonly recruitment = inject(RecruitmentService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<ScreeningRunDialogComponent, AiGeneration | null>);
  readonly data = inject<ScreeningRunDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly saving = signal(false);
  readonly jobs = signal<JobOpening[]>([]);

  /** Searchable on the server, so every candidate is reachable, not just the first page. */
  readonly candidate = new FormControl<PickerValue>(this.initialCandidate(), {
    validators: [Validators.required, mustPickOption],
  });
  readonly candidateOptions = personSuggestions(this.candidate, (search) =>
    this.recruitment.listCandidates({ search, page: 1, pageSize: 10 }).pipe(
      map((res) =>
        res.items.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`.trim(), detail: c.email })),
      ),
    ),
  );
  readonly displayPerson = displayPerson;

  readonly form = this.fb.nonNullable.group({
    jobOpeningId: [this.data.jobOpeningId ?? ''],
    notes: [''],
  });

  constructor() {
    guardDirtyDialog(this.dialogRef, () => (this.form.dirty || this.candidate.dirty) && !this.saving());
    this.recruitment.listJobs({ page: 1, pageSize: 100 }).subscribe({
      next: (res) => this.jobs.set(res.items),
      error: () => this.jobs.set([]),
    });
  }

  jobLabel(j: JobOpening): string {
    return `${j.title} (${j.code})`;
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.candidate.markAsTouched();
    const candidateId = pickedId(this.candidate.value);
    if (!candidateId || this.form.invalid || this.saving()) {
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.ai
      .screenResume({
        candidateId,
        jobOpeningId: raw.jobOpeningId.trim() || null,
        notes: raw.notes.trim() || null,
      })
      .subscribe({
        next: (generation) => {
          this.toast.success('Resume screening complete.');
          this.dialogRef.close(generation);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(
            err?.error?.message || err?.message || 'Screening failed. Please try again.',
          );
          this.saving.set(false);
        },
      });
  }
  private initialCandidate(): PersonOption | null {
    return this.data.candidateId ? { id: this.data.candidateId, name: 'Selected candidate', detail: '' } : null;
  }

}
