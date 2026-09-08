import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeaturePlaceholderComponent } from '../../shared/components/feature-placeholder/feature-placeholder.component';

@Component({
  selector: 'app-ai-placeholder',
  standalone: true,
  imports: [FeaturePlaceholderComponent],
  templateUrl: './ai-placeholder.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiPlaceholderComponent {}