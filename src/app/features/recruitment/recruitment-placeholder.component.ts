import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeaturePlaceholderComponent } from '../../shared/components/feature-placeholder/feature-placeholder.component';

@Component({
  selector: 'app-recruitment-placeholder',
  standalone: true,
  imports: [FeaturePlaceholderComponent],
  templateUrl: './recruitment-placeholder.component.html',
  styleUrl: './recruitment-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecruitmentPlaceholderComponent {}