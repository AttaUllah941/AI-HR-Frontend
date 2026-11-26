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
import { EmployeeService } from '../../../core/services/employee.service';
import {
  PerformanceReview,
  PerformanceService,
} from '../../../core/services/performance.service';
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

export interface AppraisalRunDialogData {
  employeeId?: string;
  reviewId?: string;
}

@Component({
  selector: 'app-appraisal-run-dialog',
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
  templateUrl: './appraisal-run-dialog.component.html',
  styleUrl: './appraisal-run-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppraisalRunDialogComponent {
  protected readonly generationMessages = LOADER_MESSAGES.generation;
  private readonly fb = inject(FormBuilder);
  private readonly ai = inject(AiService);
  private readonly employeesApi = inject(EmployeeService);
  private readonly performance = inject(PerformanceService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<AppraisalRunDialogComponent, AiGeneration | null>);
  readonly data = inject<AppraisalRunDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly saving = signal(false);
  readonly reviews = signal<PerformanceReview[]>([]);

  /** Searchable on the server, so every employee is reachable, not just the first page. */
  readonly employee = new FormControl<PickerValue>(this.initialEmployee(), {
    validators: [Validators.required, mustPickOption],
  });
  readonly employeeOptions = personSuggestions(this.employee, (search) =>
    this.employeesApi.list({ search, page: 1, pageSize: 10, sortBy: 'lastName', sortDir: 'asc' }).pipe(
      map((res) =>
        res.items.map((e) => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`.trim(),
          detail: e.employeeCode,
        })),
      ),
    ),
  );
  readonly displayPerson = displayPerson;

  readonly form = this.fb.nonNullable.group({
    reviewId: [this.data.reviewId ?? ''],
    periodLabel: [''],
  });

  constructor() {
    guardDirtyDialog(this.dialogRef, () => (this.form.dirty || this.employee.dirty) && !this.saving());
    // Reviews belong to the chosen employee; typing in the picker clears them until someone is picked.
    this.employee.valueChanges.subscribe((value) => {
      this.form.controls.reviewId.setValue('');
      this.loadReviews(pickedId(value) ?? '');
    });

    if (this.data.employeeId) {
      this.loadReviews(this.data.employeeId);
    }
  }

  reviewLabel(review: PerformanceReview): string {
    const emp = review.employee
      ? `${review.employee.firstName} ${review.employee.lastName}`
      : 'Employee';
    const cycle = review.cycle?.name ? ` · ${review.cycle.name}` : '';
    return `${emp}${cycle} · ${review.status}`;
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.employee.markAsTouched();
    const employeeId = pickedId(this.employee.value);
    if (!employeeId || this.form.invalid || this.saving()) {
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.ai
      .generateAppraisal({
        employeeId,
        reviewId: raw.reviewId.trim() || null,
        periodLabel: raw.periodLabel.trim() || null,
      })
      .subscribe({
        next: (generation) => {
          this.toast.success('Appraisal draft generated.');
          this.dialogRef.close(generation);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(
            err?.error?.message || err?.message || 'Appraisal generation failed.',
          );
          this.saving.set(false);
        },
      });
  }

  private initialEmployee(): PersonOption | null {
    return this.data.employeeId ? { id: this.data.employeeId, name: 'Selected employee', detail: '' } : null;
  }

  private loadReviews(employeeId: string): void {
    if (!employeeId) {
      this.reviews.set([]);
      return;
    }
    this.performance.listReviews({ employeeId, page: 1, pageSize: 50 }).subscribe({
      next: (res) => this.reviews.set(res.items),
      error: () => this.reviews.set([]),
    });
  }
}
