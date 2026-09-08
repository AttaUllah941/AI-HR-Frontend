export type PayrollRunStatus = 'DRAFT' | 'READY' | 'PROCESSING' | 'COMPLETED';

export interface PayrollRun {
  id: string;
  companyId: string;
  year: number;
  month: number;
  label: string;
  status: PayrollRunStatus;
  currency: string;
  employeeCount: number;
  totalBase: number;
  totalBonus: number;
  totalDeductions: number;
  totalNet: number;
  processedAt?: string | null;
}

export interface PayrollEntry {
  id: string;
  companyId: string;
  payrollRunId: string;
  employeeId: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  netPay: number;
  notes?: string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    position?: string | null;
    initials: string;
    department?: { id: string; name: string } | null;
  };
}

export interface PayrollListResponse {
  run: PayrollRun;
  items: PayrollEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
