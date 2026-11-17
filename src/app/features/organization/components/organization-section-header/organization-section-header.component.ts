import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-organization-section-header',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './organization-section-header.component.html',
  styleUrl: './organization-section-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSectionHeaderComponent {
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly icon = input<string>('folder');
  readonly count = input<number | null>(null);
}
