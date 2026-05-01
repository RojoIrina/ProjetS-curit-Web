// ================================================================
// SHARED TYPES — Frontend type definitions
// These types should match the API response shapes
// ================================================================

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'student' | 'verifier';
  isActive: boolean;
  institutionId: string | null;
  completedModules: string[];
}

export interface Module {
  id: string;
  title: string;
  description: string | null;
  creditHours: number;
  isActive: boolean;
}

export interface Certificate {
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
  revokedAt: string | null;
  qrPayload?: string;
}
