import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { LeaveBalance, LeaveService } from '../../../../core/services/leave.service';
import { EmployeeListItem, EmployeeService } from '../../../../core/services/employee.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { LeaveBalanceFormDialogComponent } from '../../dialogs/leave-balance-form-dialog.component';

@Component({
  selector: 'app-leave-balances-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
    OrganizationSectionHeaderComponent,
  ],
  templateUrl: './leave-balances-page.component.html',
  styleUrl: './leave-balances-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveBalancesPageComponent implements OnInit {
  private readonly leave = inject(LeaveService);
  private readonly employeesApi = inject(EmployeeService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  readonly currentYear = new Date().getFullYear();
  readonly yearOptions = [this.currentYear - 1, this.currentYear, this.currentYear + 1];

  readonly items = signal<LeaveBalance[]>([]);
  readonly employees = signal<EmployeeListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly canUpdate = this.auth.hasPermission('leave:update');
  readonly canFilterEmployees =
    this.auth.hasPermission('leave:update') || this.auth.hasPermission('leave:approve');

  readonly yearControl = new FormControl(this.currentYear, { nonNullable: true });
  readonly employeeControl = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    if (this.canFilterEmployees) {
      this.employeesApi.list({ page: 1, pageSize: 100, sortBy: 'lastName', sortDir: 'asc' }).subscribe({
        next: (res) => this.employees.set(res.items),
      });
    }
    this.yearControl.valueChanges.subscribe(() => this.reload());
    this.employeeControl.valueChanges.subscribe(() => this.reload());
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.leave
      .listBalances({
        year: this.yearControl.value,
        employeeId: this.employeeControl.value || undefined,
      })
      .subscribe({
        next: (items) => {
          this.items.set(items);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Unable to load leave balances. Please try again.');
          this.loading.set(false);
        },
      });
  }

  openForm(balance: LeaveBalance | null = null): void {
    this.dialog
      .open(LeaveBalanceFormDialogComponent, {
        data: { balance, year: this.yearControl.value },
        width: '520px',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.reload();
        }
      });
  }

  available(balance: LeaveBalance): number {
    return Math.round(this.leave.availableDays(balance) * 10) / 10;
  }
}
