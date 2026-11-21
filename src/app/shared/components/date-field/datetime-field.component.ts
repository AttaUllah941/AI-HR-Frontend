import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  forwardRef,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { format } from 'date-fns';
import { toDate, toIsoLocalDateTime } from '../../../core/utils/date-format';
import { DATE_FIELD_PROVIDERS } from './date-field.providers';

/**
 * Drop-in replacement for <input type="datetime-local">: a calendar plus a time box, side by side.
 * The value stays the old "yyyy-MM-ddTHH:mm" string (empty string when cleared).
 *
 *   <app-datetime-field label="Check-in" formControlName="checkInAt" />
 */
@Component({
  selector: 'app-datetime-field',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateTimeFieldComponent), multi: true },
    ...DATE_FIELD_PROVIDERS,
  ],
  host: { style: 'display: block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dt-field">
      <mat-form-field appearance="outline" class="dt-field__date">
        <mat-label>{{ label() }}</mat-label>
        <input
          matInput
          [matDatepicker]="picker"
          [formControl]="dateControl"
          placeholder="DD MMM YYYY"
          [errorStateMatcher]="matcher"
          (blur)="touched()"
        />
        <mat-datepicker-toggle matIconSuffix [for]="picker" />
        <mat-datepicker #picker (closed)="touched()" />
        @if (error()) {
          <mat-error>{{ error() }}</mat-error>
        }
      </mat-form-field>
      <mat-form-field appearance="outline" class="dt-field__time">
        <mat-label>Time</mat-label>
        <input
          matInput
          type="time"
          [formControl]="timeControl"
          [errorStateMatcher]="matcher"
          (blur)="touched()"
        />
      </mat-form-field>
    </div>
  `,
  styles: [
    `
      .dt-field {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 8.5rem;
        gap: 0.5rem;
      }
      .dt-field mat-form-field {
        width: 100%;
      }
    `,
  ],
})
export class DateTimeFieldComponent implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly error = input('');

  protected readonly dateControl = new FormControl<Date | null>(null);
  protected readonly timeControl = new FormControl<string>('', { nonNullable: true });
  protected readonly matcher: ErrorStateMatcher = { isErrorState: () => this.error() !== '' };

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    const destroyRef = inject(DestroyRef);
    const emit = () => {
      const date = this.dateControl.value;
      if (!date) {
        this.onChange('');
        return;
      }
      // A date with no time yet means the start of that day.
      this.onChange(`${format(date, 'yyyy-MM-dd')}T${this.timeControl.value || '00:00'}`);
    };
    this.dateControl.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(emit);
    this.timeControl.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(emit);
  }

  protected touched(): void {
    this.onTouched();
  }

  writeValue(value: string | null): void {
    const date = toDate(value);
    this.dateControl.setValue(date, { emitEvent: false });
    this.timeControl.setValue(date ? toIsoLocalDateTime(date).slice(11) : '', { emitEvent: false });
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    for (const c of [this.dateControl, this.timeControl]) {
      if (isDisabled) {
        c.disable({ emitEvent: false });
      } else {
        c.enable({ emitEvent: false });
      }
    }
  }
}
