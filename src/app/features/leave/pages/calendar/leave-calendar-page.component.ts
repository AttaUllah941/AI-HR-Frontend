import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LeaveCalendarEvent, LeaveService } from '../../../../core/services/leave.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';

interface CalendarDay {
  date: Date;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  events: LeaveCalendarEvent[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Component({
  selector: 'app-leave-calendar-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
    OrganizationSectionHeaderComponent,
  ],
  templateUrl: './leave-calendar-page.component.html',
  styleUrl: './leave-calendar-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveCalendarPageComponent implements OnInit {
  private readonly leave = inject(LeaveService);

  readonly weekdays = WEEKDAYS;
  readonly cursor = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  readonly events = signal<LeaveCalendarEvent[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly monthLabel = computed(() =>
    this.cursor().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  );

  readonly days = computed<CalendarDay[]>(() => {
    const cursor = this.cursor();
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayIso = new Date().toISOString().slice(0, 10);
    const events = this.events();
    const cells: CalendarDay[] = [];

    for (let i = 0; i < startPad; i++) {
      const d = new Date(year, month, 1 - (startPad - i));
      const iso = this.toIso(d);
      cells.push({
        date: d,
        iso,
        inMonth: false,
        isToday: iso === todayIso,
        events: this.eventsForDay(events, iso),
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const iso = this.toIso(d);
      cells.push({
        date: d,
        iso,
        inMonth: true,
        isToday: iso === todayIso,
        events: this.eventsForDay(events, iso),
      });
    }

    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date;
      const d = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
      const iso = this.toIso(d);
      cells.push({
        date: d,
        iso,
        inMonth: false,
        isToday: iso === todayIso,
        events: this.eventsForDay(events, iso),
      });
    }

    return cells;
  });

  ngOnInit(): void {
    this.reload();
  }

  prevMonth(): void {
    const c = this.cursor();
    this.cursor.set(new Date(c.getFullYear(), c.getMonth() - 1, 1));
    this.reload();
  }

  nextMonth(): void {
    const c = this.cursor();
    this.cursor.set(new Date(c.getFullYear(), c.getMonth() + 1, 1));
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const c = this.cursor();
    const from = this.toIso(new Date(c.getFullYear(), c.getMonth(), 1));
    const to = this.toIso(new Date(c.getFullYear(), c.getMonth() + 1, 0));
    this.leave.getCalendar(from, to).subscribe({
      next: (items) => {
        this.events.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load leave calendar. Please try again.');
        this.loading.set(false);
      },
    });
  }

  eventLabel(event: LeaveCalendarEvent): string {
    if (event.employeeName?.trim()) {
      const parts = event.employeeName.trim().split(/\s+/);
      const first = parts[0] ?? '';
      const lastInitial = parts.length > 1 ? `${parts[parts.length - 1][0]}.` : '';
      return `${first} ${lastInitial}`.trim();
    }
    return event.leaveTypeName || 'Leave';
  }

  private eventsForDay(events: LeaveCalendarEvent[], iso: string): LeaveCalendarEvent[] {
    return events.filter((event) => {
      const start = event.startDate.slice(0, 10);
      const end = event.endDate.slice(0, 10);
      return iso >= start && iso <= end;
    });
  }

  private toIso(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
