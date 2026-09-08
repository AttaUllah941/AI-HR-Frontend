export type EmploymentStatus = 'ACTIVE' | 'REMOTE' | 'ON_LEAVE' | 'INACTIVE' | 'TERMINATED';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';

export interface EmployeeRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  displayName?: string | null;
}

export interface EmployeeDepartmentRef {
  id: string;
  name: string;
  code?: string | null;
}

export interface Employee {
  id: string;
  companyId: string;
  userId?: string | null;
  employeeNumber?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  position?: string | null;
  departmentId?: string | null;
  department?: EmployeeDepartmentRef | null;
  locationId?: string | null;
  location?: { id: string; name: string } | null;
  managerId?: string | null;
  manager?: EmployeeRef | null;
  hireDate?: string | null;
  employmentType: EmploymentType;
  status: EmploymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeListResponse {
  items: Employee[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface EmployeeListParams {
  search?: string;
  departmentId?: string;
  status?: EmploymentStatus;
  page?: number;
  pageSize?: number;
  sort?: 'name' | 'hireDate' | 'status' | 'department';
  order?: 'asc' | 'desc';
}
