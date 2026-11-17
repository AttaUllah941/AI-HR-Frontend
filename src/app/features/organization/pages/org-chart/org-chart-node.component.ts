import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { OrgChartNode } from '../../../../core/services/organization.service';

/**
 * One node of the org chart, following the WAI-ARIA tree pattern.
 * Left/Right collapse, expand and move between parent/child; the page handles Up/Down/Home/End.
 */
@Component({
  selector: 'app-org-chart-node',
  standalone: true,
  imports: [MatIconModule, OrgChartNodeComponent],
  templateUrl: './org-chart-node.component.html',
  styleUrl: './org-chart-node.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgChartNodeComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly node = input.required<OrgChartNode>();
  readonly level = input(1);
  /** The first root item is the tab stop; arrow keys move focus from there (roving tabindex). */
  readonly first = input(false);

  readonly expanded = signal(true);
  readonly hasChildren = computed(() => this.node().children.length > 0);

  toggle(): void {
    this.expanded.update((value) => !value);
  }

  onKeydown(event: KeyboardEvent): void {
    // Keys from nested items bubble up through their ancestors; only handle our own.
    if (event.target !== event.currentTarget) {
      return;
    }

    const item = event.currentTarget as HTMLElement;
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        if (!this.hasChildren()) {
          return;
        }
        if (!this.expanded()) {
          this.expanded.set(true);
        } else {
          item.querySelector<HTMLElement>(':scope > ul > app-org-chart-node > [role="treeitem"]')?.focus();
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (this.hasChildren() && this.expanded()) {
          this.expanded.set(false);
        } else {
          this.host.nativeElement.parentElement?.closest<HTMLElement>('[role="treeitem"]')?.focus();
        }
        break;
      case 'Enter':
      case ' ':
        if (this.hasChildren()) {
          event.preventDefault();
          this.toggle();
        }
        break;
    }
  }
}
