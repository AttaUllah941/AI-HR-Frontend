import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeaturePlaceholderComponent } from '../../shared/components/feature-placeholder/feature-placeholder.component';

@Component({
  selector: 'app-organization-placeholder',
  standalone: true,
  imports: [FeaturePlaceholderComponent],
  templateUrl: './organization-placeholder.component.html',
  styleUrl: './organization-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationPlaceholderComponent {}