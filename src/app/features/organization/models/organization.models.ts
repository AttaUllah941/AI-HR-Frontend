export interface CompanyProfile {
  id: string;
  name: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  timezone: string;
  locale: string;
  isActive: boolean;
  updatedAt: string;
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  code?: string | null;
  description?: string | null;
  parentId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  companyId: string;
  name: string;
  code?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  timezone?: string | null;
  isHeadquarters: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationOverview {
  company: CompanyProfile;
  stats: {
    departments: number;
    locations: number;
  };
}

export interface OrganizationListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
