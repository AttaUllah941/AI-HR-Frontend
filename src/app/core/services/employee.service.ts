import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';

export type EmployeeStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'ON_LEAVE'
  | 'PROBATION'
  | 'NOTICE_PERIOD'
  | 'TERMINATED'
  | 'RESIGNED'
  | 'INACTIVE';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN' | 'CONSULTANT';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export interface OrgRef {
  id: string;
  name: string;
  code: string;
  level?: number;
}

export interface ManagerRef {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
}

export interface EmployeeListItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: EmployeeStatus;
  employmentType: EmploymentType;
  joinDate: string | null;
  workLocation: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  branch: OrgRef | null;
  department: OrgRef | null;
  team: OrgRef | null;
  designation: OrgRef | null;
  manager: ManagerRef | null;
}

export interface EmergencyContact {
  id: string;
  employeeId: string;
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
  isPrimary: boolean;
}

export interface EducationRecord {
  id: string;
  employeeId: string;
  institution: string;
  degree: string | null;
  fieldOfStudy: string | null;
  startDate: string | null;
  endDate: string | null;
  grade: string | null;
  description: string | null;
}

export interface ExperienceRecord {
  id: string;
  employeeId: string;
  companyName: string;
  title: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
}

export interface SkillRecord {
  id: string;
  employeeId: string;
  name: string;
  level: string | null;
  years: number | null;
}

export interface CertificationRecord {
  id: string;
  employeeId: string;
  name: string;
  issuer: string | null;
  credentialId: string | null;
  issuedDate: string | null;
  expiryDate: string | null;
  documentUrl: string | null;
}

export interface DocumentRecord {
  id: string;
  employeeId: string;
  title: string;
  category: string;
  fileName: string | null;
  fileUrl: string | null;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
}

export interface EmployeeDetail extends EmployeeListItem {
  personalEmail: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  nationality: string | null;
  maritalStatus: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  probationEndDate: string | null;
  confirmationDate: string | null;
  exitDate: string | null;
  workLocation: string | null;
  bio: string | null;
  notes: string | null;
  emergencyContacts: EmergencyContact[];
  education: EducationRecord[];
  experience: ExperienceRecord[];
  skills: SkillRecord[];
  certifications: CertificationRecord[];
  documents: DocumentRecord[];
}

export interface EmployeeListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: EmployeeStatus | '';
  branchId?: string;
  departmentId?: string;
  teamId?: string;
  designationId?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface PaginatedEmployees {
  items: EmployeeListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface TimelineEvent {
  date: string;
  label: string;
  type: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  actor: { id: string; firstName: string; lastName: string; email: string } | null;
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly api = inject(ApiService);

  list(params: EmployeeListParams = {}): Observable<PaginatedEmployees> {
    return this.api
      .get<PaginatedEmployees>('/employees', params as Record<string, string | number>)
      .pipe(map((res) => this.unwrap(res)));
  }

  getById(id: string): Observable<EmployeeDetail> {
    return this.api.get<EmployeeDetail>(`/employees/${id}`).pipe(map((res) => this.unwrap(res)));
  }

  create(body: Record<string, unknown>): Observable<EmployeeDetail> {
    return this.api.post<EmployeeDetail>('/employees', body).pipe(map((res) => this.unwrap(res)));
  }

  update(id: string, body: Record<string, unknown>): Observable<EmployeeDetail> {
    return this.api.patch<EmployeeDetail>(`/employees/${id}`, body).pipe(map((res) => this.unwrap(res)));
  }

  delete(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/employees/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  getTimeline(id: string): Observable<{ employeeId: string; status: EmployeeStatus; events: TimelineEvent[] }> {
    return this.api
      .get<{ employeeId: string; status: EmployeeStatus; events: TimelineEvent[] }>(
        `/employees/${id}/timeline`,
      )
      .pipe(map((res) => this.unwrap(res)));
  }

  getActivity(id: string, limit = 20): Observable<{ items: ActivityItem[] }> {
    return this.api
      .get<{ items: ActivityItem[] }>(`/employees/${id}/activity`, { limit })
      .pipe(map((res) => this.unwrap(res)));
  }

  createEmergencyContact(employeeId: string, body: Record<string, unknown>): Observable<EmergencyContact> {
    return this.api
      .post<EmergencyContact>(`/employees/${employeeId}/emergency-contacts`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateEmergencyContact(
    employeeId: string,
    contactId: string,
    body: Record<string, unknown>,
  ): Observable<EmergencyContact> {
    return this.api
      .patch<EmergencyContact>(`/employees/${employeeId}/emergency-contacts/${contactId}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteEmergencyContact(employeeId: string, contactId: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(
        `/employees/${employeeId}/emergency-contacts/${contactId}`,
      )
      .pipe(map((res) => this.unwrap(res)));
  }

  createEducation(employeeId: string, body: Record<string, unknown>): Observable<EducationRecord> {
    return this.api
      .post<EducationRecord>(`/employees/${employeeId}/education`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateEducation(
    employeeId: string,
    eduId: string,
    body: Record<string, unknown>,
  ): Observable<EducationRecord> {
    return this.api
      .patch<EducationRecord>(`/employees/${employeeId}/education/${eduId}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteEducation(employeeId: string, eduId: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/employees/${employeeId}/education/${eduId}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  createExperience(employeeId: string, body: Record<string, unknown>): Observable<ExperienceRecord> {
    return this.api
      .post<ExperienceRecord>(`/employees/${employeeId}/experience`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateExperience(
    employeeId: string,
    expId: string,
    body: Record<string, unknown>,
  ): Observable<ExperienceRecord> {
    return this.api
      .patch<ExperienceRecord>(`/employees/${employeeId}/experience/${expId}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteExperience(employeeId: string, expId: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/employees/${employeeId}/experience/${expId}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  createSkill(employeeId: string, body: Record<string, unknown>): Observable<SkillRecord> {
    return this.api
      .post<SkillRecord>(`/employees/${employeeId}/skills`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateSkill(employeeId: string, skillId: string, body: Record<string, unknown>): Observable<SkillRecord> {
    return this.api
      .patch<SkillRecord>(`/employees/${employeeId}/skills/${skillId}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteSkill(employeeId: string, skillId: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/employees/${employeeId}/skills/${skillId}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  createCertification(employeeId: string, body: Record<string, unknown>): Observable<CertificationRecord> {
    return this.api
      .post<CertificationRecord>(`/employees/${employeeId}/certifications`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateCertification(
    employeeId: string,
    certId: string,
    body: Record<string, unknown>,
  ): Observable<CertificationRecord> {
    return this.api
      .patch<CertificationRecord>(`/employees/${employeeId}/certifications/${certId}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteCertification(employeeId: string, certId: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/employees/${employeeId}/certifications/${certId}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  createDocument(employeeId: string, body: Record<string, unknown>): Observable<DocumentRecord> {
    return this.api
      .post<DocumentRecord>(`/employees/${employeeId}/documents`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateDocument(
    employeeId: string,
    docId: string,
    body: Record<string, unknown>,
  ): Observable<DocumentRecord> {
    return this.api
      .patch<DocumentRecord>(`/employees/${employeeId}/documents/${docId}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteDocument(employeeId: string, docId: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<{ id: string; deleted: boolean }>(`/employees/${employeeId}/documents/${docId}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    return res.data;
  }
}
