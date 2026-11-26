import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TablePrefs } from '../../../../core/utils/table-prefs';
import type { OrgListControls, OrgStatusFilter } from '../../utils/org-list';

export interface OrgColumnOption {
  id: string;
  label: string;
}

/** Search, status filter and table view options (density, columns) shared by the Organization lists. */
@Component({
  selector: 'app-organization-list-toolbar',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './organization-list-toolbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationListToolbarComponent {
  readonly list = input.required<OrgListControls>();
  readonly prefs = input.required<TablePrefs>();
  readonly columns = input<readonly OrgColumnOption[]>([]);
  /** Plural noun used in labels, e.g. "departments". */
  readonly noun = input.required<string>();

  protected readonly statusOptions: ReadonlyArray<{ value: OrgStatusFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];
}
