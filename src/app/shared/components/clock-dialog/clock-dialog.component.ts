import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { format } from 'date-fns';
import { formatDuration, formatTime } from '../../../core/utils/date-format';

export interface ClockDialogData {
  action: 'in' | 'out';
  /** ISO time of today's check-in; shown (with time worked so far) when checking out. */
  checkInAt?: string | null;
}

export interface ClockDialogResult {
  note: string;
}

const NOTE_MAX = 200;

/** Confirmation modal for check-in / check-out: live clock, today's date and an optional note. */
@Component({
  selector: 'app-clock-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './clock-dialog.component.html',
  styleUrl: './clock-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClockDialogComponent {
  readonly data = inject<ClockDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ClockDialogComponent, ClockDialogResult>);

  readonly noteMax = NOTE_MAX;
  readonly note = new FormControl('', { nonNullable: true });

  private readonly now = signal(new Date());
  readonly time = computed(() => format(this.now(), 'hh:mm:ss'));
  readonly meridiem = computed(() => format(this.now(), 'a'));
  readonly dateLine = computed(() => format(this.now(), 'EEEE, dd MMMM yyyy'));

  readonly isOut = this.data.action === 'out';
  readonly title = this.isOut ? 'Check out' : 'Check in';
  readonly confirmLabel = this.isOut ? 'Check out now' : 'Check in now';
  readonly icon = this.isOut ? 'logout' : 'login';
  readonly checkedInAt = formatTime(this.data.checkInAt);
  readonly worked = computed(() => formatDuration(this.data.checkInAt, this.now()));

  constructor() {
    const timer = setInterval(() => this.now.set(new Date()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  confirm(): void {
    this.dialogRef.close({ note: this.note.value.trim().slice(0, NOTE_MAX) });
  }
}
