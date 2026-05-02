// ================================================================
// VERIFICATION REPOSITORY — Data access layer for VerificationLog
// ================================================================
import { prisma } from '../config/database.js';
import type { VerificationMethod, VerificationResult } from '@prisma/client';

export function create(data: {
  certificateId: string | null;
  certificateUid: string;
  method: VerificationMethod;
  result: VerificationResult;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  return prisma.verificationLog.create({
    data: {
      certificateId: data.certificateId,
      certificateUid: data.certificateUid,
      method: data.method,
      result: data.result,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
    },
  });
}
