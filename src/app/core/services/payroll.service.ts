import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';

export type SalaryComponentKind = 'ALLOWANCE' | 'DEDUCTION' | 'BONUS' | 'TAX';
export type SalaryCalcType = 'FIXED' | 'PERCENT_OF_BASIC';
export type PayrollRunStatus =
  | 'DRAFT'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'APPROVED'
  | 'PAID'
  | 'CANCELLED';
export type PayslipStatus = 'GENERATED' | 'PAID' | 'VOID';

export interface PayrollEmployeeRef {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  department?: { id: string; name: string; code: string } | null;
  designation?: { id: string; name: string; code: string } | null;
}

export interface SalaryComponent {
  id: string;
  name: string;
  code: string;
  kind: SalaryComponentKind;
  calcType: SalaryCalcType;
  defaultValue: number;
  isTaxable: boolean;
  isActive: boolean;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SalaryStructureItem {
  id?: string;
  componentId: string;
  value: number;
  component?: SalaryComponent | null;
}

export interface SalaryStructure {
  id: string;
  employeeId: string;
  basicSalary: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankIban: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  employee?: PayrollEmployeeRef;
  components?: SalaryStructureItem[];
}

export interface TaxSetting {
  id: string;
  taxYear: number;
  standardRate: number;
  personalAllowance: number;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayrollRun {
  id: string;
  year: number;
  month: number;
  title: string;
  status: PayrollRunStatus;
  processedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: { entries?: number };
  entryCount?: number;
  totalGross?: number;
  totalNet?: number;
}

export interface PayrollEntryLine {
  id: string;
  componentId: string | null;
  kind: SalaryComponentKind;
  label: string;
  amount: number;
}

export interface PayrollEntry {
  id: string;
  payrollRunId: string;
  employeeId: string;
  basicSalary: number;
  totalAllowances: number;
  totalBonuses: number;
  totalDeductions: number;
  totalTax: number;
  grossPay: number;
  netPay: number;
  createdAt?: string;
  updatedAt?: string;
  employee?: PayrollEmployeeRef;
  lines?: PayrollEntryLine[];
  payslip?: Payslip | null;
}

export interface Payslip {
  id: string;
  employeeId: string;
  payrollEntryId: string;
  year: number;
  month: number;
  basicSalary: number;
  totalAllowances: number;
  totalBonuses: number;
  totalDeductions: number;
  totalTax: number;
  grossPay: number;
  netPay: number;
  currency: string;
  status: PayslipStatus;
  generatedAt: string;
  paidAt: string | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
  employee?: PayrollEmployeeRef;
  entry?: PayrollEntry | null;
}

export interface PayrollSummary {
  scope?: 'company' | 'employee';
  year: number;
  activeSalaryStructures: number;
  runsByStatus?: Record<string, number>;
  draftRuns: number;
  completedRuns: number;
  approvedRuns: number;
  paidRuns: number;
  ytdGross: number;
  ytdNet: number;
  ytdTax: number;
  payslipCount: number;
  months: Array<{
    month: number;
    status: PayrollRunStatus;
    title: string;
    entryCount: number;
    grossPay: number;
    netPay: number;
  }>;
}

export interface PayrollMySummary {
  scope?: 'employee';
  year: number;
  employeeId: string;
  payslipCount: number;
  ytdGross: number;
  ytdNet: number;
  ytdTax: number;
  ytdAllowances?: number;
  ytdBonuses?: number;
  ytdDeductions?: number;
  latestPayslip: Payslip | null;
  recentPayslips?: Payslip[];
}

export interface PayrollReport {
  year: number;
  byStatus: Array<{
    status: PayrollRunStatus;
    count: number;
  }>;
  byMonth: Array<{
    month: number;
    status: PayrollRunStatus;
    title: string;
    entryCount: number;
    grossPay: number;
    netPay: number;
    totalTax?: number;
    totalDeductions?: number;
  }>;
}

export interface PayrollRunListParams {
  status?: PayrollRunStatus | '';
  year?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginatedPayrollRuns {
  items: PayrollRun[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PayslipListParams {
  year?: number;
  month?: number;
  status?: PayslipStatus | '';
  employeeId?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedPayslips {
  items: Payslip[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface SalaryStructureListParams {
  employeeId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PaginatedSalaryStructures {
  items: SalaryStructure[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface SalaryComponentListParams {
  kind?: SalaryComponentKind | '';
}

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private readonly api = inject(ApiService);

  getSummary(year?: number): Observable<PayrollSummary> {
    return this.api
      .get<PayrollSummary>('/payroll/summary', { year })
      .pipe(map((res) => this.unwrap(res)));
  }

  getMySummary(year?: number): Observable<PayrollMySummary> {
    return this.api
      .get<PayrollMySummary>('/payroll/me/summary', { year })
      .pipe(map((res) => this.unwrap(res)));
  }

  getReport(year?: number): Observable<PayrollReport> {
    return this.api
      .get<PayrollReport>('/payroll/report', { year })
      .pipe(map((res) => this.unwrap(res)));
  }

  listComponents(params: SalaryComponentListParams = {}): Observable<SalaryComponent[]> {
    return this.api
      .get<{ items: SalaryComponent[] }>(
        '/payroll/components',
        params as Record<string, string | number>,
      )
      .pipe(map((res) => this.unwrap(res).items));
  }

  createComponent(body: Record<string, unknown>): Observable<SalaryComponent> {
    return this.api
      .post<SalaryComponent>('/payroll/components', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateComponent(id: string, body: Record<string, unknown>): Observable<SalaryComponent> {
    return this.api
      .patch<SalaryComponent>(`/payroll/components/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteComponent(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/payroll/components/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  listStructures(
    params: SalaryStructureListParams = {},
  ): Observable<PaginatedSalaryStructures | SalaryStructure[]> {
    return this.api
      .get<PaginatedSalaryStructures | { items: SalaryStructure[] }>(
        '/payroll/structures',
        params as Record<string, string | number | boolean>,
      )
      .pipe(
        map((res) => {
          const data = this.unwrap(res);
          if (Array.isArray(data)) {
            return data;
          }
          if ('pagination' in data) {
            return data as PaginatedSalaryStructures;
          }
          return (data as { items: SalaryStructure[] }).items;
        }),
      );
  }

  getStructure(id: string): Observable<SalaryStructure> {
    return this.api
      .get<SalaryStructure>(`/payroll/structures/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  createStructure(body: Record<string, unknown>): Observable<SalaryStructure> {
    return this.api
      .post<SalaryStructure>('/payroll/structures', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateStructure(id: string, body: Record<string, unknown>): Observable<SalaryStructure> {
    return this.api
      .patch<SalaryStructure>(`/payroll/structures/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteStructure(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/payroll/structures/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  getTax(): Observable<TaxSetting> {
    return this.api.get<TaxSetting>('/payroll/tax').pipe(map((res) => this.unwrap(res)));
  }

  updateTax(body: Record<string, unknown>): Observable<TaxSetting> {
    return this.api
      .patch<TaxSetting>('/payroll/tax', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  listRuns(params: PayrollRunListParams = {}): Observable<PaginatedPayrollRuns> {
    return this.api
      .get<PaginatedPayrollRuns>('/payroll/runs', params as Record<string, string | number>)
      .pipe(map((res) => this.unwrap(res)));
  }

  getRun(id: string): Observable<PayrollRun> {
    return this.api.get<PayrollRun>(`/payroll/runs/${id}`).pipe(map((res) => this.unwrap(res)));
  }

  createRun(body: Record<string, unknown>): Observable<PayrollRun> {
    return this.api
      .post<PayrollRun>('/payroll/runs', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateRun(id: string, body: Record<string, unknown>): Observable<PayrollRun> {
    return this.api
      .patch<PayrollRun>(`/payroll/runs/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  processRun(id: string): Observable<PayrollRun> {
    return this.api
      .post<PayrollRun>(`/payroll/runs/${id}/process`, {})
      .pipe(map((res) => this.unwrap(res)));
  }

  approveRun(id: string): Observable<PayrollRun> {
    return this.api
      .post<PayrollRun>(`/payroll/runs/${id}/approve`, {})
      .pipe(map((res) => this.unwrap(res)));
  }

  markPaid(id: string): Observable<PayrollRun> {
    return this.api
      .post<PayrollRun>(`/payroll/runs/${id}/mark-paid`, {})
      .pipe(map((res) => this.unwrap(res)));
  }

  cancelRun(id: string): Observable<PayrollRun> {
    return this.api
      .post<PayrollRun>(`/payroll/runs/${id}/cancel`, {})
      .pipe(map((res) => this.unwrap(res)));
  }

  listEntries(runId: string): Observable<PayrollEntry[]> {
    return this.api
      .get<{ items: PayrollEntry[] }>(`/payroll/runs/${runId}/entries`)
      .pipe(map((res) => this.unwrap(res).items));
  }

  listPayslips(params: PayslipListParams = {}): Observable<PaginatedPayslips> {
    return this.api
      .get<PaginatedPayslips>('/payroll/payslips', params as Record<string, string | number>)
      .pipe(map((res) => this.unwrap(res)));
  }

  getPayslip(id: string): Observable<Payslip> {
    return this.api
      .get<Payslip>(`/payroll/payslips/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  getMyPayslips(params: PayslipListParams = {}): Observable<PaginatedPayslips | Payslip[]> {
    return this.api
      .get<PaginatedPayslips | { items: Payslip[] }>(
        '/payroll/me/payslips',
        params as Record<string, string | number>,
      )
      .pipe(
        map((res) => {
          const data = this.unwrap(res);
          if (Array.isArray(data)) {
            return data;
          }
          if ('pagination' in data) {
            return data as PaginatedPayslips;
          }
          return (data as { items: Payslip[] }).items;
        }),
      );
  }

  formatMoney(amount: number, currency = 'USD'): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount ?? 0);
    } catch {
      return `${currency} ${(amount ?? 0).toFixed(2)}`;
    }
  }

  monthLabel(month: number): string {
    if (month < 1 || month > 12) {
      return String(month);
    }
    return new Date(2000, month - 1, 1).toLocaleString('en-US', { month: 'long' });
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    return res.data;
  }
}
