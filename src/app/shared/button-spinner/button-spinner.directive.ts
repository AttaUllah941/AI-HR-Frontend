import {
  Directive,
  ElementRef,
  Renderer2,
  booleanAttribute,
  effect,
  inject,
  input,
} from '@angular/core';

/**
 * Inline spinner for action buttons. While `appButtonSpinner` is true the button shows a
 * spinner, is marked `aria-busy`/`aria-disabled`, and swallows clicks (including implicit
 * form submits), so double submits are impossible without removing it from the tab order.
 *
 *   <button mat-flat-button [appButtonSpinner]="saving()">Save</button>
 *
 * Spinner styling lives in global styles (`.app-btn-spinner`).
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
  private readonly renderer = inject(Renderer2);
  private spinner: HTMLElement | null = null;

  readonly pending = input(false, { alias: 'appButtonSpinner', transform: booleanAttribute });

  constructor() {
    // Capturing listener on the target runs before handlers bound by the template or other directives.
    this.host.addEventListener('click', this.blockWhilePending, true);

    effect((onCleanup) => {
      if (this.pending()) {
        this.attachSpinner();
      } else {
        this.detachSpinner();
      }
      onCleanup(() => this.detachSpinner());
    });
  }

  private readonly blockWhilePending = (event: Event): void => {
    if (this.pending()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  private attachSpinner(): void {
    if (this.spinner) {
      return;
    }
    const spinner = this.renderer.createElement('span') as HTMLElement;
    this.renderer.addClass(spinner, 'app-btn-spinner');
    this.renderer.setAttribute(spinner, 'role', 'status');
    this.renderer.setAttribute(spinner, 'aria-live', 'polite');
    this.renderer.setAttribute(spinner, 'aria-label', 'Working');
    this.renderer.insertBefore(this.host, spinner, this.host.firstChild);
    this.spinner = spinner;
  }

  private detachSpinner(): void {
    if (this.spinner) {
      this.renderer.removeChild(this.host, this.spinner);
      this.spinner = null;
    }
  }
}
