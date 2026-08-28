import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeaturePlaceholderComponent } from '../../shared/components/feature-placeholder/feature-placeholder.component';

@Component({
  selector: 'app-notifications-placeholder',
  standalone: true,
  imports: [FeaturePlaceholderComponent],
  templateUrl: './notifications-placeholder.component.html',
  styleUrl: './notifications-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPlaceholderComponent {}