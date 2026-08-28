import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeaturePlaceholderComponent } from '../../shared/components/feature-placeholder/feature-placeholder.component';

@Component({
  selector: 'app-attendance-placeholder',
  standalone: true,
  imports: [FeaturePlaceholderComponent],
  templateUrl: './attendance-placeholder.component.html',
  styleUrl: './attendance-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendancePlaceholderComponent {}