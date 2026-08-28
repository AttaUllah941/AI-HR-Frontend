import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeaturePlaceholderComponent } from '../../shared/components/feature-placeholder/feature-placeholder.component';

@Component({
  selector: 'app-employees-placeholder',
  standalone: true,
  imports: [FeaturePlaceholderComponent],
  templateUrl: './employees-placeholder.component.html',
  styleUrl: './employees-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeesPlaceholderComponent {}