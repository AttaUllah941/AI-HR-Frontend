import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import {
  firstInvalidIp,
  ipListValidator,
  isIpOrCidr,
  isValidLocale,
  isValidTimeZone,
  localeValidator,
  parseIpList,
  timeZoneValidator,
} from './validators';

describe('isIpOrCidr', () => {
  it('accepts IPv4 addresses and ranges', () => {
    for (const ok of ['192.168.1.10', '10.0.0.0/8', '0.0.0.0/0', '255.255.255.255/32']) {
      expect(isIpOrCidr(ok), ok).toBe(true);
    }
  });

  it('accepts IPv6 addresses and ranges', () => {
    for (const ok of ['::1', '2001:db8::/32', 'fe80::1', '::ffff:192.168.0.1']) {
      expect(isIpOrCidr(ok), ok).toBe(true);
    }
  });

  it('rejects anything else', () => {
    for (const bad of ['', ' ', '256.1.1.1', '1.2.3', '1.2.3.4/33', '1.2.3.4/', '1.2.3.4/8/8', '01.2.3.4', 'office', 'zzzz::1', '::1/129', '1.2.3.4.5']) {
      expect(isIpOrCidr(bad), JSON.stringify(bad)).toBe(false);
    }
  });
});

describe('IP list helpers', () => {
  it('splits on lines and commas and drops blanks', () => {
    expect(parseIpList('1.1.1.1\n\n 2.2.2.2 , 3.3.3.3,')).toEqual(['1.1.1.1', '2.2.2.2', '3.3.3.3']);
    expect(parseIpList('')).toEqual([]);
  });

  it('reports the first bad entry', () => {
    expect(firstInvalidIp(['1.1.1.1', 'oops', 'nope'])).toBe('oops');
    expect(firstInvalidIp(['1.1.1.1'])).toBeNull();
  });

  it('validates a textarea value, treating empty as valid', () => {
    expect(ipListValidator(new FormControl(''))).toBeNull();
    expect(ipListValidator(new FormControl('10.0.0.0/8\n1.2.3'))).toEqual({ ipList: '1.2.3' });
  });
});

describe('time zone and locale validation', () => {
  it('recognises real IANA zones only', () => {
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Asia/Karachi')).toBe(true);
    expect(isValidTimeZone('Asia/Karachii')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });

  it('recognises valid locales only', () => {
    expect(isValidLocale('en-US')).toBe(true);
    expect(isValidLocale('ur-PK')).toBe(true);
    expect(isValidLocale('en_US')).toBe(false);
    expect(isValidLocale('not a locale')).toBe(false);
  });

  it('leaves empty values to the required validator', () => {
    expect(timeZoneValidator(new FormControl(''))).toBeNull();
    expect(localeValidator(new FormControl(' '))).toBeNull();
    expect(timeZoneValidator(new FormControl('Mars/Base'))).toEqual({ timezone: true });
    expect(localeValidator(new FormControl('xx_YY'))).toEqual({ locale: true });
  });
});
