import { differenceInMinutes, format, isValid, parseISO } from 'date-fns';

/**
 * One place for every date shown or sent by the UI, built on date-fns.
 * Display formats are fixed so the whole app reads the same: "21 Nov 2026", "09:05 AM".
 */
export const DATE_FORMAT = 'dd MMM yyyy';
export const TIME_FORMAT = 'hh:mm a';
export const DATE_TIME_FORMAT = 'dd MMM yyyy, hh:mm a';

/** Wire formats used by the API and by form controls. */
export const ISO_DATE = 'yyyy-MM-dd';
export const ISO_DATE_TIME_LOCAL = "yyyy-MM-dd'T'HH:mm";

export type DateInput = string | number | Date | null | undefined;

/**
 * Converts API values to a Date, or null when empty/invalid. A date-only string ("2026-11-21") is
 * read as that calendar day in local time, so it never shifts to the previous day in UTC-minus zones.
 */
export function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const date =
    value instanceof Date ? value : typeof value === 'number' ? new Date(value) : parseISO(value);
  return isValid(date) ? date : null;
}

function render(value: DateInput, pattern: string, fallback: string): string {
  const date = toDate(value);
  return date ? format(date, pattern) : fallback;
}

export const formatDate = (value: DateInput, fallback = '—') => render(value, DATE_FORMAT, fallback);
export const formatTime = (value: DateInput, fallback = '—') => render(value, TIME_FORMAT, fallback);
export const formatDateTime = (value: DateInput, fallback = '—') =>
  render(value, DATE_TIME_FORMAT, fallback);
export const formatMonthYear = (value: DateInput, fallback = '—') =>
  render(value, 'MMMM yyyy', fallback);
export const formatWeekdayDate = (value: DateInput, fallback = '—') =>
  render(value, 'EEE, dd MMM yyyy', fallback);

const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "3 hours ago", "in 2 days", "yesterday". */
export function formatRelative(value: DateInput, fallback = '—'): string {
  const date = toDate(value);
  if (!date) {
    return fallback;
  }
  const minutes = differenceInMinutes(date, new Date());
  const abs = Math.abs(minutes);
  if (abs < 1) return 'just now';
  if (abs < 60) return RELATIVE.format(minutes, 'minute');
  if (abs < 60 * 24) return RELATIVE.format(Math.trunc(minutes / 60), 'hour');
  if (abs < 60 * 24 * 30) return RELATIVE.format(Math.trunc(minutes / (60 * 24)), 'day');
  return RELATIVE.format(Math.trunc(minutes / (60 * 24 * 30)), 'month');
}

/** "7h 45m" between two instants (null while the end is unknown). */
export function formatDuration(from: DateInput, to: DateInput): string | null {
  const start = toDate(from);
  const end = toDate(to);
  if (!start || !end) {
    return null;
  }
  const minutes = Math.max(0, differenceInMinutes(end, start));
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

/** Local calendar day as "yyyy-MM-dd" (what <input type="date"> and the API use). */
export function toIsoDate(value: DateInput): string {
  const date = toDate(value);
  return date ? format(date, ISO_DATE) : '';
}

/** Parses "yyyy-MM-dd" to a local Date, or null. */
export function fromIsoDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  // Built by hand (not date-fns parse) to keep the initial bundle small.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    return null;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  const same = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return same ? date : null;
}

/** Local "yyyy-MM-ddTHH:mm" (what <input type="datetime-local"> used to produce). */
export function toIsoLocalDateTime(value: DateInput): string {
  const date = toDate(value);
  return date ? format(date, ISO_DATE_TIME_LOCAL) : '';
}

/**
 * Compact range: "14 Oct 2026" (same day), "14–15 Oct 2026", "28 Oct – 02 Nov 2026" or, across years,
 * "30 Dec 2026 – 02 Jan 2027". Avoids repeating the month and year in every range.
 */
export function formatDateRange(from: DateInput, to: DateInput, fallback = '—'): string {
  const start = toDate(from);
  const end = toDate(to);
  if (!start && !end) {
    return fallback;
  }
  if (!start || !end) {
    return formatDate(start ?? end, fallback);
  }
  if (format(start, ISO_DATE) === format(end, ISO_DATE)) {
    return format(start, DATE_FORMAT);
  }
  if (start.getFullYear() !== end.getFullYear()) {
    return `${format(start, DATE_FORMAT)} – ${format(end, DATE_FORMAT)}`;
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${format(start, 'dd MMM')} – ${format(end, DATE_FORMAT)}`;
  }
  return `${format(start, 'dd')}–${format(end, DATE_FORMAT)}`;
}
