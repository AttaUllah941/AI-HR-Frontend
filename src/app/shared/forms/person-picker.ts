import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, ValidationErrors } from '@angular/forms';
import { Observable, catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';

/** A person (employee, candidate, user…) shown in an autocomplete. */
export interface PersonOption {
  id: string;
  name: string;
  detail: string;
}

/** The control holds the typed text until an option is chosen, then the option itself. */
export type PickerValue = string | PersonOption | null;

/** Typed text that was never turned into a chosen option is not a valid value. */
export function mustPickOption(control: AbstractControl): ValidationErrors | null {
  const value = control.value as PickerValue;
  return typeof value === 'string' && value.trim() !== '' ? { notSelected: true } : null;
}

/** `[displayWith]` for a mat-autocomplete bound to a picker control. */
export function displayPerson(value: PickerValue): string {
  return value && typeof value === 'object' ? value.name : '';
}

/** The id of the chosen option, or undefined when nothing (or only loose text) is chosen. */
export function pickedId(value: PickerValue): string | undefined {
  return value && typeof value === 'object' ? value.id : undefined;
}

/**
 * Debounced server-side suggestions for an autocomplete, as a signal. A failed request yields an
 * empty list and is reported through `onError` so the form can explain why nothing shows up.
 * Call it from a field initializer (it needs an injection context).
 */
export function personSuggestions(
  control: FormControl<PickerValue>,
  fetch: (search: string) => Observable<PersonOption[]>,
  onError?: () => void,
) {
  return toSignal(
    control.valueChanges.pipe(
      startWith(control.value),
      map((value) => (typeof value === 'string' ? value.trim() : '')),
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((search) =>
        fetch(search).pipe(
          catchError(() => {
            onError?.();
            return of([] as PersonOption[]);
          }),
        ),
      ),
    ),
    { initialValue: [] as PersonOption[] },
  );
}
