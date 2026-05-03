// ================================================================
// SHARED FRONTEND TYPES — Typed API response interfaces
// Eliminates all `any` usage in API client and contexts
// ================================================================

/** Standard API response envelope */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
}

/** Authenticated user from JWT */
export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'student' | 'verifier';
  institutionId: string | null;
}

/** Login response (access token + user; refresh token is HttpOnly cookie) */
export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

/** Full user profile response */
export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'student' | 'verifier';
  isActive: boolean;
  institutionId: string | null;
  institution?: { id: string; name: string } | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  userModules?: UserModuleResponse[];
}

/** User module progress entry */
export interface UserModuleResponse {
  moduleId: string;
  status: string;
  completedAt: string | null;
  module: { id: string; title: string; isRequired?: boolean };
}

/** Admin create user response */
export interface CreateUserResponse {
  user: UserResponse;
  temporaryPassword: string;
}

/** Module response */
export interface ModuleResponse {
  id: string;
  title: string;
  description: string | null;
  content: string;
  creditHours: number;
  order: number;
  duration: number;
  isRequired: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Student progress per module */
export interface ModuleProgressResponse {
  id: string;
  title: string;
  description: string | null;
  content: string;
  creditHours: number;
  order: number;
  duration: number;
  isRequired: boolean;
  status: 'enrolled' | 'in_progress' | 'completed' | 'not_enrolled';
  completedAt: string | null;
}

export interface StudentProgressOverview {
  id: string;
  fullName: string;
  email: string;
  institutionId: string | null;
  completedCount: number;
  totalRequired: number;
  percent: number;
  modules: Array<{
    moduleId: string;
    title: string;
    isRequired: boolean;
    status: string;
    completedAt: string | null;
  }>;
}

/** Certificate response */
export interface CertificateResponse {
  id: string;
  certificateUid: string;
  studentId: string;
  studentName: string;
  title: string;
  documentHash: string;
  digitalSignature?: string;
  status: string;
  accessKey?: string;
  issuedAt: string;
  expiresAt?: string | null;
  revokedAt: string | null;
  revocationReason?: string | null;
  qrPayload?: string;
  student?: { id: string; fullName: string; email: string };
  institution?: { id: string; name: string };
}

/** Verification result */
export interface VerifyResult {
  valid: boolean;
  result: 'valid' | 'invalid' | 'revoked' | 'expired' | 'not_found';
  certificate?: CertificateResponse;
  details?: Record<string, unknown>;
}
