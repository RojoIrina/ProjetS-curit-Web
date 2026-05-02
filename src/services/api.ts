// ================================================================
// API CLIENT — Frontend service for all backend API calls
// Handles JWT authentication, auto-refresh on 401, typed responses
//
// Security:
//   - Access token: stored in memory only (NOT localStorage/sessionStorage)
//   - Refresh token: HttpOnly cookie (set by server, never accessible to JS)
//   - All requests use credentials: 'include' for cookie transmission
// ================================================================

import type {
  ApiResponse, AuthUser, LoginResponse, UserResponse, ModuleResponse,
  ModuleProgressResponse, CertificateResponse, VerifyResult, CreateUserResponse,
} from '../types/api.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ─── Token Management ───
// Only access token in memory — refresh token is HttpOnly cookie
let accessToken: string | null = null;

export function setAccessToken(access: string) {
  accessToken = access;
}

export function clearTokens() {
  accessToken = null;
}

export function getAccessToken() {
  return accessToken;
}

// Legacy compat — setTokens still works but ignores refresh (it's in cookie now)
export function setTokens(access: string, _refresh?: string) {
  accessToken = access;
}

// ─── Base Fetch Wrapper ───

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Send HttpOnly cookies
  });

  // Auto-refresh on 401
  if (response.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      });
    }
  }

  const data = await response.json();
  return data as ApiResponse<T>;
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Send refresh token cookie
    });

    if (!res.ok) {
      clearTokens();
      return false;
    }

    const data = await res.json();
    if (data.success && data.data) {
      setAccessToken(data.data.accessToken);
      return true;
    }

    clearTokens();
    return false;
  } catch {
    clearTokens();
    return false;
  }
}

// ─── Auth API ───

export type { AuthUser, LoginResponse, VerifyResult };

export async function loginApi(email: string, password: string) {
  const res = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (res.success && res.data) {
    setAccessToken(res.data.accessToken);
    // refreshToken is set as HttpOnly cookie by server
  }
  return res;
}

export async function logoutApi() {
  const res = await apiFetch('/auth/logout', { method: 'POST' });
  clearTokens();
  return res;
}

export async function getProfileApi() {
  return apiFetch<UserResponse>('/auth/profile');
}

// ─── Users API ───

export async function listUsersApi(filters?: { role?: string }) {
  const params = filters?.role ? `?role=${filters.role}` : '';
  return apiFetch<UserResponse[]>(`/users${params}`);
}

export async function createUserApi(data: {
  email: string;
  fullName: string;
  role: string;
  institutionId?: string;
}) {
  return apiFetch<CreateUserResponse>('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUserApi(id: string, data: Record<string, unknown>) {
  return apiFetch<UserResponse>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteUserApi(id: string) {
  return apiFetch<{ message: string }>(`/users/${id}`, { method: 'DELETE' });
}

export async function toggleModuleApi(userId: string, moduleId: string) {
  return apiFetch<{ userId: string; moduleId: string; status: string }>(`/users/${userId}/modules`, {
    method: 'POST',
    body: JSON.stringify({ moduleId }),
  });
}

// ─── Modules API ───

export async function listModulesApi() {
  return apiFetch<ModuleResponse[]>('/modules');
}

export async function createModuleApi(data: {
  title: string;
  description?: string;
  institutionId?: string;
}) {
  return apiFetch<ModuleResponse>('/modules', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateModuleApi(id: string, data: Record<string, unknown>) {
  return apiFetch<ModuleResponse>(`/modules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteModuleApi(id: string) {
  return apiFetch<{ message: string }>(`/modules/${id}`, { method: 'DELETE' });
}

export async function enrollModuleApi(moduleId: string) {
  return apiFetch<{ userId: string; moduleId: string; status: string }>(`/modules/${moduleId}/enroll`, { method: 'POST' });
}

export async function completeModuleApi(moduleId: string, userId?: string) {
  return apiFetch<{ userId: string; moduleId: string; status: string }>(`/modules/${moduleId}/complete`, {
    method: 'POST',
    body: JSON.stringify(userId ? { userId } : {}),
  });
}

export async function getProgressApi() {
  return apiFetch<ModuleProgressResponse[]>('/modules/progress');
}

// ─── Certificates API ───

export async function listCertificatesApi(filters?: { studentId?: string }) {
  const params = filters?.studentId ? `?studentId=${filters.studentId}` : '';
  return apiFetch<CertificateResponse[]>(`/certificates${params}`);
}

export async function getCertificateApi(id: string) {
  return apiFetch<CertificateResponse>(`/certificates/${id}`);
}

export async function issueCertificateApi(data: {
  studentId: string;
  title: string;
  institutionId?: string;
}) {
  return apiFetch<CertificateResponse>('/certificates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function revokeCertificateApi(id: string, reason: string) {
  return apiFetch<CertificateResponse>(`/certificates/${id}/revoke`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function downloadCertificateApi(uid: string, accessKey: string) {
  const res = await fetch(`${API_BASE}/certificates/${uid}/download?key=${accessKey}`, {
    credentials: 'include',
  });
  return (await res.json()) as ApiResponse<CertificateResponse>;
}

// ─── Public Verification API (no auth) ───

export async function verifyCertificateApi(uid: string, qrSig?: string) {
  const params = qrSig ? `?sig=${qrSig}` : '';
  // No auth needed for verification
  const res = await fetch(`${API_BASE}/verify/${uid.toUpperCase()}${params}`);
  return (await res.json()) as ApiResponse<VerifyResult>;
}
