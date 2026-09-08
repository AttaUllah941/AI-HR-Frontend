export type LeaveType = 'ANNUAL' | 'SICK' | 'PERSONAL';
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position?: string | null;
  initials: string;
}

export interface LeaveBalance {
  leaveType: LeaveType;
  label: string;
  allotted: number;
  used: number;
  remaining: number;
}

export interface LeaveSummary {
  year: number;
  balances: LeaveBalance[];
  pendingCount: number;
}

export interface LeaveRequest {
  id: string;
  companyId: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  dayCount: number;
  reason?: string | null;
  status: LeaveRequestStatus;
  employee: LeaveEmployee;
}

export interface CompanyHoliday {
  id: string;
  name: string;
  holidayDate: string;
  regionLabel?: string | null;
}
