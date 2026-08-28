import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeaturePlaceholderComponent } from '../../shared/components/feature-placeholder/feature-placeholder.component';

@Component({
  selector: 'app-reports-placeholder',
  standalone: true,
  imports: [FeaturePlaceholderComponent],
  templateUrl: './reports-placeholder.component.html',
  styleUrl: './reports-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPlaceholderComponent {}