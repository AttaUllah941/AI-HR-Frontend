import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { LOADER_MESSAGES } from './loader-messages';

/** Length of the fade between two messages (kept in sync with the CSS transition). */
export const SMART_LOADER_FADE_MS = 200;

/** Fisher-Yates shuffle; returns a new array. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Spinner with rotating status messages for long operations. Messages are shuffled once on
 * init and cycled without ever repeating the same message back to back. The set is read once
 * on init; changing `messages` later has no effect.
 */
@Component({
  selector: 'app-smart-loader',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="loader" role="status" aria-live="polite" aria-atomic="true">
      <div class="loader__bars" aria-hidden="true">
        <app-skeleton width="100%" height="0.8rem" />
        <app-skeleton width="86%" height="0.8rem" />
        <app-skeleton width="64%" height="0.8rem" />
      </div>
      <p class="loader__message" [class.loader__message--fading]="fading()">{{ current() }}</p>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .loader {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 2rem 1rem;
      text-align: center;
      color: var(--mat-sys-on-surface-variant, var(--zh-muted-foreground, #5b6170));
    }
    .loader__bars {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      width: min(20rem, 100%);
    }
    .loader__message {
      margin: 0;
      min-height: 1.5em;
      font-size: 0.95rem;
      opacity: 1;
      transition: opacity 200ms ease;
    }
    .loader__message--fading {
      opacity: 0;
    }
    @media (prefers-reduced-motion: reduce) {
      .loader__message {
        transition: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmartLoaderComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly messages = input<readonly string[]>(LOADER_MESSAGES.default);
  readonly intervalMs = input(2200);
  /** Unused now that the spinner is a skeleton; kept so existing templates still compile. */
  readonly diameter = input(40);

  readonly current = signal('');
  readonly fading = signal(false);

  private order: string[] = [];
  private index = 0;
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.order = shuffle(this.messages());
    this.current.set(this.order[0] ?? '');

    if (this.order.length < 2) {
      return;
    }

    const interval = setInterval(() => this.rotate(), this.intervalMs());
    this.destroyRef.onDestroy(() => {
      clearInterval(interval);
      if (this.fadeTimer !== null) {
        clearTimeout(this.fadeTimer);
      }
    });
  }

  private rotate(): void {
    this.fading.set(true);
    this.fadeTimer = setTimeout(() => {
      this.fadeTimer = null;
      this.current.set(this.nextMessage());
      this.fading.set(false);
    }, SMART_LOADER_FADE_MS);
  }

  private nextMessage(): string {
    this.index += 1;
    if (this.index >= this.order.length) {
      const last = this.order[this.order.length - 1];
      this.order = shuffle(this.order);
      // Never show the same message twice in a row across a reshuffle.
      if (this.order[0] === last) {
        [this.order[0], this.order[1]] = [this.order[1], this.order[0]];
      }
      this.index = 0;
    }
    return this.order[this.index];
  }
}
