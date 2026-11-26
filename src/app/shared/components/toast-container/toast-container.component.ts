import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ToastKind, ToastService } from '../../../core/services/toast.service';

const ICONS: Record<ToastKind, string> = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
};

/** Renders ToastService's stack. Mounted once in the app root. */
@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="toasts">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="toast toast--{{ toast.kind }}"
          [attr.role]="toast.kind === 'error' ? 'alert' : 'status'"
          (mouseenter)="toastService.pause(toast.id)"
          (mouseleave)="toastService.resume(toast.id)"
          (focusin)="toastService.pause(toast.id)"
          (focusout)="toastService.resume(toast.id)"
        >
          <mat-icon class="toast__icon" aria-hidden="true">{{ icon(toast.kind) }}</mat-icon>
          <span class="toast__message">{{ toast.message }}</span>
          @if (toast.actionLabel) {
            <button
              mat-button
              type="button"
              class="toast__action"
              (click)="toastService.runAction(toast.id)"
            >
              {{ toast.actionLabel }}
            </button>
          }
          <button
            mat-icon-button
            type="button"
            class="toast__close"
            aria-label="Dismiss notification"
            (click)="toastService.dismiss(toast.id)"
          >
            <mat-icon aria-hidden="true">close</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      bottom: 1.25rem;
      right: 1.25rem;
      z-index: 2000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: min(24rem, calc(100vw - 2rem));
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.6rem 0.5rem 0.6rem 0.9rem;
      border-radius: calc(var(--zh-radius, 0.875rem) - 2px);
      border: 1px solid var(--mat-sys-outline-variant, var(--zh-border, #e5e7eb));
      border-inline-start-width: 4px;
      background: var(--mat-sys-surface-container-high, var(--zh-card, #fff));
      color: var(--mat-sys-on-surface, var(--zh-foreground, #1f2430));
      box-shadow: var(--zh-shadow-md, 0 4px 12px rgb(0 0 0 / 0.12));
      animation: toast-in 160ms ease-out;
    }
    .toast--success {
      border-inline-start-color: var(--zh-success, #16a34a);
    }
    .toast--error {
      border-inline-start-color: var(--mat-sys-error, var(--zh-destructive, #dc2626));
    }
    .toast--info {
      border-inline-start-color: var(--mat-sys-primary, var(--zh-primary, #4f46e5));
    }
    .toast__icon {
      flex: none;
    }
    .toast--success .toast__icon {
      color: var(--zh-success, #16a34a);
    }
    .toast--error .toast__icon {
      color: var(--mat-sys-error, var(--zh-destructive, #dc2626));
    }
    .toast--info .toast__icon {
      color: var(--mat-sys-primary, var(--zh-primary, #4f46e5));
    }
    .toast__message {
      flex: 1;
      min-width: 0;
      font-size: 0.875rem;
      overflow-wrap: anywhere;
    }
    .toast__action {
      flex: none;
      font-weight: 600;
    }
    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(0.5rem);
      }
    }
    /* Phones show a bottom tab bar: keep toasts clear of it. */
    @media (max-width: 900px) {
      .toasts {
        bottom: 4.75rem;
        right: 1rem;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .toast {
        animation: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainerComponent {
  protected readonly toastService = inject(ToastService);

  protected icon(kind: ToastKind): string {
    return ICONS[kind];
  }
}
