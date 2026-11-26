import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ORG_PAGE_SIZES, type OrgPagerControls } from '../../utils/org-list';

/** Range, rows-per-page and previous / next controls for the Organization lists. */
@Component({
  selector: 'app-organization-list-footer',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './organization-list-footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationListFooterComponent {
  readonly list = input.required<OrgPagerControls>();
  /** Plural noun used in the range text, e.g. "departments". */
  readonly noun = input.required<string>();

  protected readonly pageSizes = ORG_PAGE_SIZES;
}
