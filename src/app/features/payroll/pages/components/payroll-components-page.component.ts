import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  PayrollService,
  SalaryComponent,
  SalaryComponentKind,
} from '../../../../core/services/payroll.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { SalaryComponentFormDialogComponent } from '../../dialogs/salary-component-form-dialog.component';

const KIND_FILTERS: Array<{ value: SalaryComponentKind | ''; label: string }> = [
  { value: '', label: 'All' },
  { value: 'ALLOWANCE', label: 'Allowance' },
  { value: 'DEDUCTION', label: 'Deduction' },
  { value: 'BONUS', label: 'Bonus' },
  { value: 'TAX', label: 'Tax' },
];

@Component({
  selector: 'app-payroll-components-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
    OrganizationSectionHeaderComponent,
  ],
  templateUrl: './payroll-components-page.component.html',
  styleUrl: './payroll-components-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollComponentsPageComponent implements OnInit {
  private readonly payroll = inject(PayrollService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly allItems = signal<SalaryComponent[]>([]);
  readonly kindFilter = signal<SalaryComponentKind | ''>('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);

  readonly canCreate = this.auth.hasPermission('payroll:create');
  readonly canUpdate = this.auth.hasPermission('payroll:update');
  readonly canDelete = this.auth.hasPermission('payroll:delete');
  readonly kindFilters = KIND_FILTERS;

  readonly items = computed(() => {
    const kind = this.kindFilter();
    const list = this.allItems();
    return kind ? list.filter((c) => c.kind === kind) : list;
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.payroll.listComponents().subscribe({
      next: (items) => {
        this.allItems.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load salary components. Please try again.');
        this.loading.set(false);
      },
    });
  }

  setKind(kind: SalaryComponentKind | ''): void {
    this.kindFilter.set(kind);
  }

  openForm(component: SalaryComponent | null = null): void {
    this.dialog
      .open(SalaryComponentFormDialogComponent, {
        data: { component },
        width: '560px',
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

  remove(item: SalaryComponent): void {
    this.confirm
      .open({
        title: 'Delete salary component',
        message: `Are you sure you want to delete “${item.name}”? This action cannot be undone.`,
        confirmLabel: 'Delete component',
        destructive: true,
        icon: 'delete_forever',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.deletingId.set(item.id);
        this.payroll.deleteComponent(item.id).subscribe({
          next: () => {
            this.toast.success('Salary component deleted');
            this.deletingId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.deletingId.set(null);
            this.toast.error(err.message || 'Unable to delete salary component');
          },
        });
      });
  }

  kindLabel(kind: SalaryComponentKind): string {
    return kind.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  calcLabel(calc: string): string {
    return calc === 'PERCENT_OF_BASIC' ? '% of basic' : 'Fixed';
  }
}
