import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeaturePlaceholderComponent } from '../../shared/components/feature-placeholder/feature-placeholder.component';

@Component({
  selector: 'app-payroll-placeholder',
  standalone: true,
  imports: [FeaturePlaceholderComponent],
  templateUrl: './payroll-placeholder.component.html',
  styleUrl: './payroll-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollPlaceholderComponent {}