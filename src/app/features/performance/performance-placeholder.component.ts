import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeaturePlaceholderComponent } from '../../shared/components/feature-placeholder/feature-placeholder.component';

@Component({
  selector: 'app-performance-placeholder',
  standalone: true,
  imports: [FeaturePlaceholderComponent],
  templateUrl: './performance-placeholder.component.html',
  styleUrl: './performance-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformancePlaceholderComponent {}