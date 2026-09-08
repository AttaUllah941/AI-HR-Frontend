import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeaturePlaceholderComponent } from '../../shared/components/feature-placeholder/feature-placeholder.component';

@Component({
  selector: 'app-policies-placeholder',
  standalone: true,
  imports: [FeaturePlaceholderComponent],
  templateUrl: './policies-placeholder.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoliciesPlaceholderComponent {}
