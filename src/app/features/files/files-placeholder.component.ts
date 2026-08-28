import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeaturePlaceholderComponent } from '../../shared/components/feature-placeholder/feature-placeholder.component';

@Component({
  selector: 'app-files-placeholder',
  standalone: true,
  imports: [FeaturePlaceholderComponent],
  templateUrl: './files-placeholder.component.html',
  styleUrl: './files-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilesPlaceholderComponent {}