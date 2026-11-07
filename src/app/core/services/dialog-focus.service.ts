import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

const MENU_ITEM_SELECTOR = '.mat-mdc-menu-panel';
const MENU_TRIGGER_SELECTOR = '[aria-haspopup="menu"][aria-expanded="true"]';

/**
 * Returns keyboard focus to a sensible place after a dialog closes.
 *
 * Material restores focus to whatever was focused when the dialog opened. When the dialog was
 * opened from a menu item (the usual "Edit..." row action) that element no longer exists once the
 * menu closes, so focus would drop to <body>. Remember the menu's trigger button instead and
 * focus it when the dialog closes (only if focus was actually lost).
 */
@Injectable({ providedIn: 'root' })
export class DialogFocusService {
  private readonly dialog = inject(MatDialog);
  private menuTrigger: HTMLElement | null = null;
  private started = false;

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;

    // Capture phase: runs before the menu handles the click and closes.
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target as HTMLElement | null;
        this.menuTrigger = target?.closest(MENU_ITEM_SELECTOR)
          ? document.querySelector<HTMLElement>(MENU_TRIGGER_SELECTOR)
          : null;
      },
      true,
    );

    this.dialog.afterOpened.subscribe((ref) => {
      const trigger = this.menuTrigger;
      this.menuTrigger = null;
      if (!trigger) {
        return;
      }
      ref.afterClosed().subscribe(() => {
        // Let Material's own focus restoration run first, then repair it if it lost focus.
        setTimeout(() => {
          const active = document.activeElement;
          if ((!active || active === document.body) && trigger.isConnected) {
            trigger.focus();
          }
        });
      });
    });
  }
}
