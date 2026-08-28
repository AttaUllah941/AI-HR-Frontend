import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [MatCardModule, MatIconModule, PageHeaderComponent, RouterLink],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHomeComponent {
  readonly cards = [
    { title: 'Employees', value: '—', icon: 'groups', tone: 'var(--zh-primary)' },
    { title: 'Attendance', value: '—', icon: 'schedule', tone: 'var(--zh-secondary)' },
    { title: 'Leave', value: '—', icon: 'event_available', tone: 'var(--zh-success)' },
    { title: 'Payroll', value: '—', icon: 'payments', tone: 'var(--zh-warning)' },
  ];
}
