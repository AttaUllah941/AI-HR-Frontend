import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly counter = signal(0);
  readonly isLoading = signal(false);

  show(): void {
    const next = this.counter() + 1;
    this.counter.set(next);
    this.isLoading.set(true);
  }

  hide(): void {
    const next = Math.max(0, this.counter() - 1);
    this.counter.set(next);
    this.isLoading.set(next > 0);
  }

  reset(): void {
    this.counter.set(0);
    this.isLoading.set(false);
  }
}
