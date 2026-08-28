import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeaturePlaceholderComponent } from '../../shared/components/feature-placeholder/feature-placeholder.component';

@Component({
  selector: 'app-leave-placeholder',
  standalone: true,
  imports: [FeaturePlaceholderComponent],
  templateUrl: './leave-placeholder.component.html',
  styleUrl: './leave-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeavePlaceholderComponent {}