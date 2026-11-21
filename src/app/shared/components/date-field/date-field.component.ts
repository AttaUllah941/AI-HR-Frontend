import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  forwardRef,
  inject,
  input,
  signal,
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
import { MatFormFieldModule, SubscriptSizing } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { fromIsoDate, toIsoDate } from '../../../core/utils/date-format';
import { DATE_FIELD_PROVIDERS } from './date-field.providers';

/**
 * Drop-in replacement for <input type="date">. Opens a calendar, accepts typed dates, and keeps the
 * same value the old input produced: a "yyyy-MM-dd" string (empty string when cleared), so forms and
 * API payloads do not change.
 *
 *   <app-date-field label="Start date" formControlName="startDate" [error]="..." />
 */
@Component({
  selector: 'app-date-field',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateFieldComponent), multi: true },
    ...DATE_FIELD_PROVIDERS,
  ],
  host: { style: 'display: block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field appearance="outline" [subscriptSizing]="subscriptSizing()" class="date-field">
      <mat-label>{{ label() }}</mat-label>
      <input
        matInput
        [matDatepicker]="picker"
        [formControl]="control"
        [min]="minDate()"
        [max]="maxDate()"
        [placeholder]="placeholder()"
        [required]="required()"
        [errorStateMatcher]="matcher"
        (blur)="touched()"
      />
      <mat-datepicker-toggle matIconSuffix [for]="picker" />
      <mat-datepicker #picker (closed)="touched()" />
      @if (error()) {
        <mat-error>{{ error() }}</mat-error>
      } @else if (hint()) {
        <mat-hint>{{ hint() }}</mat-hint>
      }
    </mat-form-field>
  `,
  styles: [
    `
      .date-field {
        width: 100%;
      }
    `,
  ],
})
export class DateFieldComponent implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly placeholder = input('DD MMM YYYY');
  readonly hint = input('');
  /** Message shown in the field's error slot; any non-empty text also turns the field red. */
  readonly error = input('');
  readonly required = input(false);
  /** "yyyy-MM-dd" bounds. */
  readonly min = input<string | null>(null);
  readonly max = input<string | null>(null);
  readonly subscriptSizing = input<SubscriptSizing>('fixed');

  protected readonly minDate = computed(() => fromIsoDate(this.min()));
  protected readonly maxDate = computed(() => fromIsoDate(this.max()));

  protected readonly control = new FormControl<Date | null>(null);
  protected readonly matcher: ErrorStateMatcher = { isErrorState: () => this.error() !== '' };

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private readonly destroyRef = inject(DestroyRef);
  private readonly disabled = signal(false);

  constructor() {
    this.control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      // A half-typed date is null/invalid: report it as empty instead of a wrong day.
      this.onChange(value ? toIsoDate(value) : '');
    });
  }

  protected touched(): void {
    this.onTouched();
  }

  writeValue(value: string | null): void {
    this.control.setValue(fromIsoDate(value), { emitEvent: false });
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    if (isDisabled) {
      this.control.disable({ emitEvent: false });
    } else {
      this.control.enable({ emitEvent: false });
    }
  }
}
