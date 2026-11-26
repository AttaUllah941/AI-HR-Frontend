import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** True for an IPv4 or IPv6 address, with an optional CIDR prefix ("10.0.0.0/8", "::1", "2001:db8::/32"). */
export function isIpOrCidr(value: string): boolean {
  const text = value.trim();
  if (!text) {
    return false;
  }
  const [address, prefix, extra] = text.split('/');
  if (extra !== undefined || !address) {
    return false;
  }

  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(address);
  if (v4) {
    const octetsOk = v4.slice(1).every((o) => Number(o) <= 255 && String(Number(o)) === o);
    return octetsOk && (prefix === undefined || (/^\d{1,2}$/.test(prefix) && Number(prefix) <= 32));
  }

  if (address.includes(':')) {
    let valid = true;
    try {
      // The URL parser validates IPv6 literals exactly.
      new URL(`http://[${address}]/`);
    } catch {
      valid = false;
    }
    return valid && (prefix === undefined || (/^\d{1,3}$/.test(prefix) && Number(prefix) <= 128));
  }
  return false;
}

/** Splits a textarea value (one entry per line, or comma separated) into trimmed, non-empty entries. */
export function parseIpList(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** The first entry that is not a valid IP or CIDR range, or null when every entry is fine. */
export function firstInvalidIp(entries: readonly string[]): string | null {
  return entries.find((entry) => !isIpOrCidr(entry)) ?? null;
}

/** Validates a textarea of IP addresses / CIDR ranges. Empty is valid (it means "no restriction"). */
export const ipListValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const bad = firstInvalidIp(parseIpList(String(control.value ?? '')));
  return bad ? { ipList: bad } : null;
};

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function isValidLocale(value: string): boolean {
  try {
    return Intl.getCanonicalLocales(value).length === 1;
  } catch {
    return false;
  }
}

/** IANA time zones the browser knows, for suggestions. Empty on browsers without the API. */
export const TIME_ZONES: readonly string[] = (() => {
  try {
    return (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];
  } catch {
    return [];
  }
})();

/** Rejects a value that is not a real IANA time zone, such as "Asia/Karachii". Empty is left to `required`. */
export const timeZoneValidator: ValidatorFn = (control) => {
  const value = String(control.value ?? '').trim();
  return value && !isValidTimeZone(value) ? { timezone: true } : null;
};

/** Rejects a value that is not a valid BCP 47 locale such as "en-US". Empty is left to `required`. */
export const localeValidator: ValidatorFn = (control) => {
  const value = String(control.value ?? '').trim();
  return value && !isValidLocale(value) ? { locale: true } : null;
};
