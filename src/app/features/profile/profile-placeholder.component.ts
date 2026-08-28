import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeaturePlaceholderComponent } from '../../shared/components/feature-placeholder/feature-placeholder.component';

@Component({
  selector: 'app-profile-placeholder',
  standalone: true,
  imports: [FeaturePlaceholderComponent],
  templateUrl: './profile-placeholder.component.html',
  styleUrl: './profile-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePlaceholderComponent {}