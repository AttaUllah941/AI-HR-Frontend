import { Directive, ElementRef, inject } from '@angular/core';
import { AppPreloadingStrategy } from './app-preloading.strategy';

/** Preloads the lazy route behind an anchor's `href` on hover/focus/touch. Applies to every `a[routerLink]`. */
@Directive({
  selector: 'a[routerLink]',
  standalone: true,
  host: {
    '(mouseenter)': 'preload()',
    '(focus)': 'preload()',
    '(touchstart)': 'preload()',
  },
})
export class PreloadOnHoverDirective {
  private readonly el = inject<ElementRef<HTMLAnchorElement>>(ElementRef);
  private readonly strategy = inject(AppPreloadingStrategy);

  preload(): void {
    // RouterLink on <a> sets href, which is the resolved URL (works for string and array links).
    const href = this.el.nativeElement.getAttribute('href') ?? '';
    const segment = href.replace(/^\//, '').split(/[/?#]/)[0];
    if (segment) {
      this.strategy.requestPreload(segment);
    }
  }
}
