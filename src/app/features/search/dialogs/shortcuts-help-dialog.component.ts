import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GlobalService, KeyboardShortcut } from '../../../core/services/global.service';

@Component({
  selector: 'app-shortcuts-help-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './shortcuts-help-dialog.component.html',
  styleUrl: './shortcuts-help-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShortcutsHelpDialogComponent implements OnInit {
  private readonly global = inject(GlobalService);

  readonly items = signal<KeyboardShortcut[]>([]);
  readonly isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || '');

  ngOnInit(): void {
    this.global.getShortcuts().subscribe({
      next: (res) => this.items.set(res.items),
      error: () => this.items.set([]),
    });
  }

  keysFor(item: KeyboardShortcut): string[] {
    return this.isMac ? item.macKeys : item.keys;
  }
}
