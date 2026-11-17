import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Empty list / no results placeholder.
 * Give it `actionLabel` (and handle `(action)`) for a primary call to action such as
 * "Add your first department", or project your own buttons.
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input<string>('');
  readonly icon = input<string>('inbox');
  /** Label of the primary action button; the button is hidden while empty. */
  readonly actionLabel = input<string>('');
  readonly actionIcon = input<string>('add');
  readonly action = output<void>();
}
