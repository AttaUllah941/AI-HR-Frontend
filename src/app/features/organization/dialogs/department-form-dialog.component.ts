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
  Branch,
  Department,
  OrganizationService,
} from '../../../core/services/organization.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-department-form-dialog',
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
  templateUrl: './department-form-dialog.component.html',
  styleUrl: './department-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly org = inject(OrganizationService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<DepartmentFormDialogComponent, boolean>);
  readonly data = inject<{ department: Department | null }>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly branches = signal<Branch[]>([]);
  readonly departments = signal<Department[]>([]);

  readonly form = this.fb.nonNullable.group({
    name: [this.data.department?.name ?? '', [Validators.required, Validators.maxLength(150)]],
    code: [this.data.department?.code ?? '', [Validators.required, Validators.maxLength(50)]],
    description: [this.data.department?.description ?? ''],
    branchId: [this.data.department?.branchId ?? ''],
    parentId: [this.data.department?.parentId ?? ''],
  });

  ngOnInit(): void {
    this.org.listBranches().subscribe({ next: (items) => this.branches.set(items) });
    this.org.listDepartments().subscribe({
      next: (items) => this.departments.set(this.filterParentOptions(items)),
    });
  }

  private filterParentOptions(items: Department[]): Department[] {
    const currentId = this.data.department?.id;
    if (!currentId) {
      return items;
    }

    const descendants = new Set<string>();
    const collectDescendants = (parentId: string): void => {
      for (const item of items) {
        if (item.parentId === parentId && !descendants.has(item.id)) {
          descendants.add(item.id);
          collectDescendants(item.id);
        }
      }
    };
    collectDescendants(currentId);

    return items.filter((item) => item.id !== currentId && !descendants.has(item.id));
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
      branchId: raw.branchId || null,
      parentId: raw.parentId || null,
    };
    const request$ = this.data.department
      ? this.org.updateDepartment(this.data.department.id, body)
      : this.org.createDepartment(body);

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.department ? 'Department updated' : 'Department created');
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Unable to save department');
      },
    });
  }
}
