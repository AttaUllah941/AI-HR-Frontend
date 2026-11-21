import { Pipe, PipeTransform } from '@angular/core';
import {
  DateInput,
  formatDate,
  formatDateTime,
  formatRelative,
  formatTime,
} from '../../core/utils/date-format';

export type AppDateStyle = 'date' | 'time' | 'datetime' | 'relative';

/**
 * Template counterpart of the date-fns helpers, so every screen formats dates the same way:
 *   {{ item.createdAt | appDate }}            21 Nov 2026
 *   {{ item.createdAt | appDate: 'datetime' }} 21 Nov 2026, 09:05 AM
 *   {{ item.createdAt | appDate: 'relative' }} 3 hours ago
 */
@Pipe({ name: 'appDate', standalone: true })
export class AppDatePipe implements PipeTransform {
  transform(value: DateInput, style: AppDateStyle = 'date'): string {
    switch (style) {
      case 'time':
        return formatTime(value);
      case 'datetime':
        return formatDateTime(value);
      case 'relative':
        return formatRelative(value);
      default:
        return formatDate(value);
    }
  }
}
