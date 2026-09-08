import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable } from 'rxjs';
import { EmployeeService } from '../../../core/services/employee.service';
import { ToastService } from '../../../core/services/toast.service';
import type { SubResourceType } from '../models/employee-sub-resource.types';

@Component({
  selector: 'app-employee-sub-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './employee-sub-form-dialog.component.html',
  styleUrl: './employee-sub-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeSubFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly employees = inject(EmployeeService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<EmployeeSubFormDialogComponent, boolean>);
  readonly data = inject<{
    type: SubResourceType;
    employeeId: string;
    record: object | null;
  }>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly formId = `sub-form-${this.data.type}`;

  readonly form = this.fb.group(this.buildControls());

  ngOnInit(): void {
    if (this.data.record) {
      this.form.patchValue(this.data.record as never);
    }
  }

  title(): string {
    const editing = Boolean((this.data.record as { id?: string } | null)?.id);
    const labels: Record<SubResourceType, string> = {
      emergency: 'Emergency contact',
      education: 'Education',
      experience: 'Experience',
      skill: 'Skill',
      certification: 'Certification',
      document: 'Document',
    };
    return `${editing ? 'Edit' : 'Add'} ${labels[this.data.type]}`;
  }

  icon(): string {
    const icons: Record<SubResourceType, string> = {
      emergency: 'contact_emergency',
      education: 'school',
      experience: 'work_history',
      skill: 'psychology',
      certification: 'verified',
      document: 'description',
    };
    return icons[this.data.type];
  }

  private buildControls() {
    switch (this.data.type) {
      case 'emergency':
        return {
          name: ['', Validators.required],
          relationship: ['', Validators.required],
          phone: ['', Validators.required],
          email: [''],
          isPrimary: [false],
        };
      case 'education':
        return {
          institution: ['', Validators.required],
          degree: [''],
          fieldOfStudy: [''],
          grade: [''],
        };
      case 'experience':
        return {
          companyName: ['', Validators.required],
          title: ['', Validators.required],
          location: [''],
          isCurrent: [false],
          description: [''],
        };
      case 'skill':
        return {
          name: ['', Validators.required],
          level: [''],
          years: [null as number | null],
        };
      case 'certification':
        return {
          name: ['', Validators.required],
          issuer: [''],
          credentialId: [''],
        };
      case 'document':
        return {
          title: ['', Validators.required],
          category: ['', Validators.required],
          fileName: [''],
          fileUrl: [''],
        };
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.saveRequest().subscribe({
      next: () => {
        this.toast.success('Saved');
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Unable to save');
      },
    });
  }

  private saveRequest(): Observable<unknown> {
    const body = this.form.getRawValue() as Record<string, unknown>;
    const recordId = (this.data.record as { id?: string } | null)?.id;
    const employeeId = this.data.employeeId;

    switch (this.data.type) {
      case 'emergency':
        return recordId
          ? this.employees.updateEmergencyContact(employeeId, recordId, body)
          : this.employees.createEmergencyContact(employeeId, body);
      case 'education':
        return recordId
          ? this.employees.updateEducation(employeeId, recordId, body)
          : this.employees.createEducation(employeeId, body);
      case 'experience':
        return recordId
          ? this.employees.updateExperience(employeeId, recordId, body)
          : this.employees.createExperience(employeeId, body);
      case 'skill':
        return recordId
          ? this.employees.updateSkill(employeeId, recordId, body)
          : this.employees.createSkill(employeeId, body);
      case 'certification':
        return recordId
          ? this.employees.updateCertification(employeeId, recordId, body)
          : this.employees.createCertification(employeeId, body);
      case 'document':
        return recordId
          ? this.employees.updateDocument(employeeId, recordId, body)
          : this.employees.createDocument(employeeId, body);
    }
  }
}
