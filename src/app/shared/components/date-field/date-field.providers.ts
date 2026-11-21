import { Provider } from '@angular/core';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { provideDateFnsAdapter } from '@angular/material-date-fns-adapter';
import { enUS } from 'date-fns/locale/en-US';

/**
 * date-fns adapter for the Material calendar, provided by the date field components themselves so it
 * is bundled with the screens that use a date picker rather than with the initial page load.
 * One display format ("21 Nov 2026") everywhere.
 */
export const DATE_FIELD_PROVIDERS: Provider[] = [
  { provide: MAT_DATE_LOCALE, useValue: enUS },
  provideDateFnsAdapter({
    parse: { dateInput: 'dd MMM yyyy' },
    display: {
      dateInput: 'dd MMM yyyy',
      monthYearLabel: 'MMM yyyy',
      dateA11yLabel: 'PPPP',
      monthYearA11yLabel: 'MMMM yyyy',
    },
  }),
];
