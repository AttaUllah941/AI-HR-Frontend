export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
  code?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  avatarUrl?: string | null;
  status?: string;
  mfaEnabled?: boolean;
  emailVerifiedAt?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSessionData extends AuthTokens {
  user: AuthUser;
}

export interface LoginSuccessData extends AuthSessionData {
  mfaRequired: false;
}

export interface LoginMfaChallengeData {
  mfaRequired: true;
  mfaToken: string;
  user: Pick<AuthUser, 'id' | 'email' | 'firstName' | 'lastName'>;
}

export type LoginResponseData = LoginSuccessData | LoginMfaChallengeData;

export interface RegisterResponseData {
  user: AuthUser;
  verificationToken?: string;
}

export interface ForgotPasswordResponseData {
  message: string;
  resetToken?: string;
}

export interface MfaSetupData {
  secret: string;
  otpauthUrl: string;
}
