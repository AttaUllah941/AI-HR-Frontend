import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs';
import { Designation, OrganizationService } from '../../../../core/services/organization.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { TablePrefs } from '../../../../core/utils/table-prefs';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationListFooterComponent } from '../../components/organization-list-footer/organization-list-footer.component';
import { OrganizationListToolbarComponent } from '../../components/organization-list-toolbar/organization-list-toolbar.component';
import { OrganizationSectionHeaderComponent } from '../../components/organization-section-header/organization-section-header.component';
import { OrganizationStatusComponent } from '../../components/organization-status/organization-status.component';
import { DesignationFormDialogComponent } from '../../dialogs/designation-form-dialog.component';
import { OrgList } from '../../utils/org-list';

@Component({
  selector: 'app-designations-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    EmptyStateComponent,
    OrganizationListFooterComponent,
    OrganizationListToolbarComponent,
    OrganizationSectionHeaderComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './designations-page.component.html',
  styleUrl: './designations-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignationsPageComponent implements OnInit {
  private readonly org = inject(OrganizationService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<Designation[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly canCreate = this.auth.hasPermission('organization:create');
  readonly canUpdate = this.auth.hasPermission('organization:update');
  readonly canDelete = this.auth.hasPermission('organization:delete');

  readonly prefs = new TablePrefs('org-designations');
  readonly columns = [
    { id: 'code', label: 'Code' },
    { id: 'level', label: 'Level' },
    { id: 'status', label: 'Status' },
  ];
  readonly list = new OrgList<Designation>({
    items: this.items,
    searchText: (d) => [d.name, d.code, d.description].filter(Boolean).join(' '),
    sorters: {
      name: (d) => d.name,
      code: (d) => d.code,
      level: (d) => d.level,
      status: (d) => (d.isActive ? 0 : 1),
    },
    defaultSort: 'level',
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    this.org.listDesignations().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load designations. Please try again.');
        this.loading.set(false);
      },
    });
  }

  openForm(designation: Designation | null = null): void {
    this.dialog
      .open(DesignationFormDialogComponent, {
        data: { designation },
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

  remove(item: Designation): void {
    this.confirm
      .open({
        title: 'Delete designation',
        message: `Are you sure you want to delete “${item.name}”? This action cannot be undone.`,
        confirmLabel: 'Delete designation',
        destructive: true,
        icon: 'delete_forever',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.deletingId.set(item.id);
        this.org.deleteDesignation(item.id).subscribe({
          next: () => {
            this.toast.success('Designation deleted');
            this.deletingId.set(null);
            this.reload();
          },
          error: (err: { error?: { message?: string } }) => {
            this.deletingId.set(null);
            this.toast.error(err?.error?.message || 'Unable to delete designation');
          },
        });
      });
  }
}
