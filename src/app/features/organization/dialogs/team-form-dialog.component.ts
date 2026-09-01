import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  Department,
  OrganizationService,
  Team,
} from '../../../core/services/organization.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-team-form-dialog',
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
  templateUrl: './team-form-dialog.component.html',
  styleUrl: './team-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly org = inject(OrganizationService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<TeamFormDialogComponent, boolean>);
  readonly data = inject<{ team: Team | null }>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly departments = signal<Department[]>([]);

  readonly form = this.fb.nonNullable.group({
    name: [this.data.team?.name ?? '', [Validators.required, Validators.maxLength(150)]],
    code: [this.data.team?.code ?? '', [Validators.required, Validators.maxLength(50)]],
    description: [this.data.team?.description ?? ''],
    departmentId: [this.data.team?.departmentId ?? '', Validators.required],
  });

  ngOnInit(): void {
    this.org.listDepartments().subscribe({ next: (items) => this.departments.set(items) });
  }

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
      description: raw.description || null,
      departmentId: raw.departmentId,
    };
    const request$ = this.data.team
      ? this.org.updateTeam(this.data.team.id, body)
      : this.org.createTeam(body);

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.team ? 'Team updated' : 'Team created');
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Unable to save team');
      },
    });
  }
}
