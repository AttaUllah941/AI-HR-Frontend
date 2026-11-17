import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DialogFocusService } from './dialog-focus.service';

describe('DialogFocusService', () => {
  let afterOpened: Subject<{ afterClosed: () => Subject<void> }>;
  let closed: Subject<void>;
  let trigger: HTMLButtonElement;
  let menuItem: HTMLButtonElement;

  beforeEach(() => {
    vi.useFakeTimers();
    afterOpened = new Subject();
    closed = new Subject();
    TestBed.configureTestingModule({ providers: [{ provide: MatDialog, useValue: { afterOpened } }] });
    TestBed.inject(DialogFocusService).start();

    trigger = document.createElement('button');
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'true');
    const panel = document.createElement('div');
    panel.className = 'mat-mdc-menu-panel';
    menuItem = document.createElement('button');
    panel.appendChild(menuItem);
    document.body.append(trigger, panel);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  const openDialogFromMenuItem = () => {
    menuItem.click();
    afterOpened.next({ afterClosed: () => closed });
  };

  it('focuses the menu trigger when a dialog opened from a menu item closes and focus was lost', () => {
    openDialogFromMenuItem();
    (document.activeElement as HTMLElement | null)?.blur();
    closed.next();
    vi.runAllTimers();
    expect(document.activeElement).toBe(trigger);
  });

  it('leaves focus alone when Material already restored it somewhere sensible', () => {
    const other = document.createElement('button');
    document.body.appendChild(other);
    openDialogFromMenuItem();
    other.focus();
    closed.next();
    vi.runAllTimers();
    expect(document.activeElement).toBe(other);
  });

  it('does nothing for dialogs not opened from a menu', () => {
    const plain = document.createElement('button');
    document.body.appendChild(plain);
    plain.click();
    afterOpened.next({ afterClosed: () => closed });
    closed.next();
    vi.runAllTimers();
    expect(document.activeElement).not.toBe(trigger);
  });
});
