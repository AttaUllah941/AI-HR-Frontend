import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

/** Matches backend `passwordSchema`: 8–128 chars, at least one letter and one number. */
export const passwordValidators: ValidatorFn[] = [
  Validators.required,
  Validators.minLength(8),
  Validators.maxLength(128),
  (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '');
    if (!value) {
      return null;
    }
    if (!/[A-Za-z]/.test(value)) {
      return { passwordLetter: true };
    }
    if (!/[0-9]/.test(value)) {
      return { passwordNumber: true };
    }
    return null;
  },
];

export function passwordErrorMessage(control: AbstractControl | null): string {
  if (!control?.errors || !control.touched) {
    return '';
  }
  if (control.errors['required']) {
    return 'Password is required';
  }
  if (control.errors['minlength']) {
    return 'Password must be at least 8 characters';
  }
  if (control.errors['maxlength']) {
    return 'Password must be at most 128 characters';
  }
  if (control.errors['passwordLetter']) {
    return 'Password must include a letter';
  }
  if (control.errors['passwordNumber']) {
    return 'Password must include a number';
  }
  return 'Invalid password';
}
