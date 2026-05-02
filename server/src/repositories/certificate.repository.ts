// ================================================================
// CERTIFICATE REPOSITORY — Data access layer for Certificate model
// ================================================================
import { prisma } from '../config/database.js';
import type { CertificateStatus } from '@prisma/client';

const CERT_INCLUDE = {
  student: { select: { id: true, fullName: true, email: true } },
  institution: { select: { id: true, name: true } },
} as const;

const CERT_WITH_KEY = {
  ...CERT_INCLUDE,
  keyPair: { select: { publicKeyPem: true } },
} as const;

export function findByUid(uid: string) {
  return prisma.certificate.findUnique({
    where: { certificateUid: uid },
    include: CERT_WITH_KEY,
  });
}

export function findByUidWithStudent(uid: string) {
  return prisma.certificate.findUnique({
    where: { certificateUid: uid },
    include: {
      student: { select: { id: true, fullName: true, email: true } },
      institution: { select: { id: true, name: true } },
      keyPair: { select: { publicKeyPem: true } },
    },
  });
}

export function findById(id: string) {
  return prisma.certificate.findUnique({
    where: { id },
    include: CERT_INCLUDE,
  });
}

export function findFirst(where: Record<string, unknown>) {
  return prisma.certificate.findFirst({ where: where as any });
}

export function findMany(filters?: {
  studentId?: string;
  institutionId?: string;
  limit?: number;
  offset?: number;
}) {
  return prisma.certificate.findMany({
    where: {
      ...(filters?.studentId && { studentId: filters.studentId }),
      ...(filters?.institutionId && { institutionId: filters.institutionId }),
    },
    include: CERT_INCLUDE,
    orderBy: { issuedAt: 'desc' },
    take: filters?.limit ?? 50,
    skip: filters?.offset ?? 0,
  });
}

export function create(data: {
  certificateUid: string;
  studentId: string;
  institutionId: string;
  issuedBy: string;
  keyPairId: string;
  title: string;
  studentName: string;
  documentHash: string;
  digitalSignature: string;
  canonicalData: Record<string, unknown>;
  status: CertificateStatus;
  accessKey: string;
}) {
  return prisma.certificate.create({
    data,
    include: CERT_INCLUDE,
  });
}

export function update(id: string, data: Record<string, unknown>) {
  return prisma.certificate.update({ where: { id }, data });
}
