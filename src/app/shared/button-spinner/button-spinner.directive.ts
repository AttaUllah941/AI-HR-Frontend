import { Directive, ElementRef, booleanAttribute, inject, input } from '@angular/core';

/**
 * Pending state for action buttons. While `appButtonSpinner` is true the button shows a
 * skeleton-style shimmer (global `.app-btn-pending` styles), is marked `aria-busy`/`aria-disabled`,
 * and swallows clicks (including implicit form submits), so double submits are impossible without
 * removing it from the tab order. Nothing is added to the button, so its size does not change.
 *
 *   <button mat-flat-button [appButtonSpinner]="saving()">Save</button>
 *
 * (The selector keeps its old name so existing templates need no change.)
 */
@Directive({
  selector: '[appButtonSpinner]',
  standalone: true,
  host: {
    '[attr.aria-busy]': 'pending() ? "true" : null',
    '[attr.aria-disabled]': 'pending() ? "true" : null',
    '[class.app-btn-pending]': 'pending()',
  },
})
export class ButtonSpinnerDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly pending = input(false, { alias: 'appButtonSpinner', transform: booleanAttribute });

  constructor() {
    // Capturing listener on the target runs before handlers bound by the template or other directives.
    this.host.addEventListener('click', this.blockWhilePending, true);
  }

  private readonly blockWhilePending = (event: Event): void => {
    if (this.pending()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
}
