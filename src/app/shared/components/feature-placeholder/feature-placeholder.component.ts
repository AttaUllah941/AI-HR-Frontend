import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { PageHeaderComponent } from '../page-header/page-header.component';

@Component({
  selector: 'app-feature-placeholder',
  standalone: true,
  imports: [EmptyStateComponent, PageHeaderComponent],
  templateUrl: './feature-placeholder.component.html',
  styleUrl: './feature-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturePlaceholderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('Module scaffolded for a later phase');
  readonly emptyTitle = input('Coming soon');
  readonly emptyMessage = input('This module will be implemented in its scheduled phase.');
  readonly icon = input('construction');
}
