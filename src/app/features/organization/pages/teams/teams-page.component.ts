import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs';
import { Team, OrganizationService } from '../../../../core/services/organization.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { TablePrefs } from '../../../../core/utils/table-prefs';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationListFooterComponent } from '../../components/organization-list-footer/organization-list-footer.component';
import { OrganizationListToolbarComponent } from '../../components/organization-list-toolbar/organization-list-toolbar.component';
import { OrganizationSectionHeaderComponent } from '../../components/organization-section-header/organization-section-header.component';
import { OrganizationStatusComponent } from '../../components/organization-status/organization-status.component';
import { TeamFormDialogComponent } from '../../dialogs/team-form-dialog.component';
import { OrgList } from '../../utils/org-list';

@Component({
  selector: 'app-teams-page',
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
  templateUrl: './teams-page.component.html',
  styleUrl: './teams-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamsPageComponent implements OnInit {
  private readonly org = inject(OrganizationService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<Team[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly canCreate = this.auth.hasPermission('organization:create');
  readonly canUpdate = this.auth.hasPermission('organization:update');
  readonly canDelete = this.auth.hasPermission('organization:delete');

  readonly prefs = new TablePrefs('org-teams');
  readonly columns = [
    { id: 'code', label: 'Code' },
    { id: 'department', label: 'Department' },
    { id: 'status', label: 'Status' },
  ];
  readonly list = new OrgList<Team>({
    items: this.items,
    searchText: (t) => [t.name, t.code, t.description, t.department?.name].filter(Boolean).join(' '),
    sorters: {
      name: (t) => t.name,
      code: (t) => t.code,
      department: (t) => t.department?.name ?? '',
      status: (t) => (t.isActive ? 0 : 1),
    },
    defaultSort: 'name',
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    this.org.listTeams().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load teams. Please try again.');
        this.loading.set(false);
      },
    });
  }

  openForm(team: Team | null = null): void {
    this.dialog
      .open(TeamFormDialogComponent, {
        data: { team },
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

  remove(item: Team): void {
    this.confirm
      .open({
        title: 'Delete team',
        message: `Are you sure you want to delete “${item.name}”? This action cannot be undone.`,
        confirmLabel: 'Delete team',
        destructive: true,
        icon: 'delete_forever',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.deletingId.set(item.id);
        this.org.deleteTeam(item.id).subscribe({
          next: () => {
            this.toast.success('Team deleted');
            this.deletingId.set(null);
            this.reload();
          },
          error: (err: { error?: { message?: string } }) => {
            this.deletingId.set(null);
            this.toast.error(err?.error?.message || 'Unable to delete team');
          },
        });
      });
  }
}
