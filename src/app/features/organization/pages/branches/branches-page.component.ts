import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs';
import { Branch, OrganizationService } from '../../../../core/services/organization.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { TablePrefs } from '../../../../core/utils/table-prefs';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationListFooterComponent } from '../../components/organization-list-footer/organization-list-footer.component';
import { OrganizationListToolbarComponent } from '../../components/organization-list-toolbar/organization-list-toolbar.component';
import { OrganizationSectionHeaderComponent } from '../../components/organization-section-header/organization-section-header.component';
import { OrganizationStatusComponent } from '../../components/organization-status/organization-status.component';
import { BranchFormDialogComponent } from '../../dialogs/branch-form-dialog.component';
import { OrgList } from '../../utils/org-list';

/** "City, Country", or whichever part exists. */
function locationOf(branch: Branch): string {
  return [branch.city, branch.country].filter(Boolean).join(', ');
}

@Component({
  selector: 'app-branches-page',
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
  templateUrl: './branches-page.component.html',
  styleUrl: './branches-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchesPageComponent implements OnInit {
  private readonly org = inject(OrganizationService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<Branch[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly canCreate = this.auth.hasPermission('organization:create');
  readonly canUpdate = this.auth.hasPermission('organization:update');
  readonly canDelete = this.auth.hasPermission('organization:delete');

  readonly prefs = new TablePrefs('org-branches');
  readonly columns = [
    { id: 'code', label: 'Code' },
    { id: 'location', label: 'Location' },
    { id: 'status', label: 'Status' },
  ];
  readonly list = new OrgList<Branch>({
    items: this.items,
    searchText: (b) => [b.name, b.code, b.city, b.state, b.country].filter(Boolean).join(' '),
    sorters: {
      name: (b) => b.name,
      code: (b) => b.code,
      location: (b) => locationOf(b),
      status: (b) => (b.isActive ? 0 : 1),
    },
    defaultSort: 'name',
  });

  protected readonly locationOf = locationOf;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    this.org.listBranches().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load branches. Please try again.');
        this.loading.set(false);
      },
    });
  }

  openForm(branch: Branch | null = null): void {
    this.dialog
      .open(BranchFormDialogComponent, {
        data: { branch },
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

  remove(item: Branch): void {
    this.confirm
      .open({
        title: 'Delete branch',
        message: `Are you sure you want to delete “${item.name}”? This action cannot be undone.`,
        confirmLabel: 'Delete branch',
        destructive: true,
        icon: 'delete_forever',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.deletingId.set(item.id);
        this.org.deleteBranch(item.id).subscribe({
          next: () => {
            this.toast.success('Branch deleted');
            this.deletingId.set(null);
            this.reload();
          },
          error: (err: { error?: { message?: string } }) => {
            this.deletingId.set(null);
            this.toast.error(err?.error?.message || 'Unable to delete branch');
          },
        });
      });
  }
}
