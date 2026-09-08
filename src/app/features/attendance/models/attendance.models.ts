export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'REMOTE' | 'ON_LEAVE';

export interface AttendanceEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position?: string | null;
  initials: string;
}

export interface AttendanceRecord {
  id: string;
  companyId: string;
  employeeId: string;
  workDate: string;
  status: AttendanceStatus;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  locationLabel?: string | null;
  notes?: string | null;
  employee: AttendanceEmployee;
}

export interface AttendanceSummary {
  date: string;
  present: number;
  late: number;
  absent: number;
  remote: number;
  onLeave: number;
  totalMarked: number;
  workforce: number;
}

export interface AttendanceCalendarDay {
  date: string;
  total: number;
  dominant: AttendanceStatus | string | null;
  counts: Record<string, number>;
}

export interface AttendanceCalendar {
  year: number;
  month: number;
  days: AttendanceCalendarDay[];
}
