import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { OrganizationService } from '../../services/organization.service';
import {
  CompanyProfile,
  Department,
  Location,
} from '../../models/organization.models';

type OrgTab = 'overview' | 'company' | 'departments' | 'locations';

@Component({
  selector: 'app-organization-home',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './organization-home.component.html',
  styleUrl: './organization-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationHomeComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly org = inject(OrganizationService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly tab = signal<OrgTab>('overview');
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly company = signal<CompanyProfile | null>(null);
  readonly departments = signal<Department[]>([]);
  readonly locations = signal<Location[]>([]);
  readonly deptTotal = signal(0);
  readonly locTotal = signal(0);
  readonly deptSearch = signal('');
  readonly locSearch = signal('');

  readonly canManage = computed(() =>
    this.auth.hasAnyPermission(
      'organization:manage',
      'organization:update',
      'organization:create',
      'organization:delete',
    ),
  );

  readonly companyForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    legalName: [''],
    email: ['', Validators.email],
    phone: [''],
    website: [''],
    addressLine1: [''],
    addressLine2: [''],
    city: [''],
    state: [''],
    country: [''],
    postalCode: [''],
    timezone: ['UTC', Validators.required],
    locale: ['en-US', Validators.required],
  });

  readonly departmentForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    code: [''],
    description: [''],
  });

  readonly locationForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    code: [''],
    addressLine1: [''],
    city: [''],
    country: [''],
    timezone: [''],
    isHeadquarters: [false],
  });

  ngOnInit(): void {
    this.reloadAll();
  }

  setTab(next: OrgTab): void {
    this.tab.set(next);
    if (next === 'departments') {
      this.loadDepartments();
    }
    if (next === 'locations') {
      this.loadLocations();
    }
  }

  reloadAll(): void {
    this.loading.set(true);
    this.org.getOverview().subscribe({
      next: (data) => {
        this.company.set(data.company);
        this.deptTotal.set(data.stats.departments);
        this.locTotal.set(data.stats.locations);
        this.patchCompanyForm(data.company);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  saveCompany(): void {
    if (this.companyForm.invalid || this.saving()) {
      this.companyForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.org.updateCompany(this.companyForm.getRawValue()).subscribe({
      next: (company) => {
        this.company.set(company);
        this.patchCompanyForm(company);
        this.saving.set(false);
        this.toast.success('Company profile updated');
      },
      error: () => this.saving.set(false),
    });
  }

  loadDepartments(): void {
    this.org.listDepartments({ search: this.deptSearch() || undefined, pageSize: 50 }).subscribe({
      next: (data) => {
        this.departments.set(data.items);
        this.deptTotal.set(data.total);
      },
    });
  }

  createDepartment(): void {
    if (this.departmentForm.invalid || this.saving()) {
      this.departmentForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const raw = this.departmentForm.getRawValue();
    this.org
      .createDepartment({
        name: raw.name,
        code: raw.code || undefined,
        description: raw.description || undefined,
      })
      .subscribe({
        next: () => {
          this.departmentForm.reset({ name: '', code: '', description: '' });
          this.saving.set(false);
          this.toast.success('Department created');
          this.loadDepartments();
          this.reloadAll();
        },
        error: () => this.saving.set(false),
      });
  }

  removeDepartment(department: Department): void {
    if (!this.canManage()) {
      return;
    }
    this.org.deleteDepartment(department.id).subscribe({
      next: () => {
        this.toast.success('Department removed');
        this.loadDepartments();
        this.reloadAll();
      },
    });
  }

  loadLocations(): void {
    this.org.listLocations({ search: this.locSearch() || undefined, pageSize: 50 }).subscribe({
      next: (data) => {
        this.locations.set(data.items);
        this.locTotal.set(data.total);
      },
    });
  }

  createLocation(): void {
    if (this.locationForm.invalid || this.saving()) {
      this.locationForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const raw = this.locationForm.getRawValue();
    this.org
      .createLocation({
        name: raw.name,
        code: raw.code || undefined,
        addressLine1: raw.addressLine1 || undefined,
        city: raw.city || undefined,
        country: raw.country || undefined,
        timezone: raw.timezone || undefined,
        isHeadquarters: raw.isHeadquarters,
      })
      .subscribe({
        next: () => {
          this.locationForm.reset({
            name: '',
            code: '',
            addressLine1: '',
            city: '',
            country: '',
            timezone: '',
            isHeadquarters: false,
          });
          this.saving.set(false);
          this.toast.success('Location created');
          this.loadLocations();
          this.reloadAll();
        },
        error: () => this.saving.set(false),
      });
  }

  removeLocation(location: Location): void {
    if (!this.canManage()) {
      return;
    }
    this.org.deleteLocation(location.id).subscribe({
      next: () => {
        this.toast.success('Location removed');
        this.loadLocations();
        this.reloadAll();
      },
    });
  }

  onDeptSearch(value: string): void {
    this.deptSearch.set(value);
    this.loadDepartments();
  }

  onLocSearch(value: string): void {
    this.locSearch.set(value);
    this.loadLocations();
  }

  placeLabel(...parts: Array<string | null | undefined>): string {
    return parts.filter((part): part is string => !!part && part.trim().length > 0).join(', ');
  }

  private patchCompanyForm(company: CompanyProfile): void {
    this.companyForm.patchValue({
      name: company.name,
      legalName: company.legalName ?? '',
      email: company.email ?? '',
      phone: company.phone ?? '',
      website: company.website ?? '',
      addressLine1: company.addressLine1 ?? '',
      addressLine2: company.addressLine2 ?? '',
      city: company.city ?? '',
      state: company.state ?? '',
      country: company.country ?? '',
      postalCode: company.postalCode ?? '',
      timezone: company.timezone,
      locale: company.locale,
    });
  }
}
