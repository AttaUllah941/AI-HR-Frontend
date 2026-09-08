import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeaturePlaceholderComponent } from '../../shared/components/feature-placeholder/feature-placeholder.component';

@Component({
  selector: 'app-settings-placeholder',
  standalone: true,
  imports: [FeaturePlaceholderComponent],
  templateUrl: './settings-placeholder.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPlaceholderComponent {}