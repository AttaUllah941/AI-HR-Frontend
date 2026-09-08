import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs';
import { Department, OrganizationService } from '../../../../core/services/organization.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../components/organization-section-header/organization-section-header.component';
import { OrganizationStatusComponent } from '../../components/organization-status/organization-status.component';
import { DepartmentFormDialogComponent } from '../../dialogs/department-form-dialog.component';

@Component({
  selector: 'app-departments-page',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    EmptyStateComponent,
    OrganizationSectionHeaderComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './departments-page.component.html',
  styleUrl: './departments-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentsPageComponent implements OnInit {
  private readonly org = inject(OrganizationService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<Department[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly canCreate = this.auth.hasPermission('organization:create');
  readonly canUpdate = this.auth.hasPermission('organization:update');
  readonly canDelete = this.auth.hasPermission('organization:delete');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    this.org.listDepartments().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load departments. Please try again.');
        this.loading.set(false);
      },
    });
  }

  openForm(department: Department | null = null): void {
    this.dialog
      .open(DepartmentFormDialogComponent, {
        data: { department },
        width: '520px',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.reload();
        }
      });
  }

  remove(item: Department): void {
    this.confirm
      .open({
        title: 'Delete department',
        message: `Are you sure you want to delete “${item.name}”? Teams under this department may be affected.`,
        confirmLabel: 'Delete department',
        destructive: true,
        icon: 'delete_forever',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.deletingId.set(item.id);
        this.org.deleteDepartment(item.id).subscribe({
          next: () => {
            this.toast.success('Department deleted');
            this.deletingId.set(null);
            this.reload();
          },
          error: () => {
            this.deletingId.set(null);
            this.toast.error('Unable to delete department');
          },
        });
      });
  }
}
