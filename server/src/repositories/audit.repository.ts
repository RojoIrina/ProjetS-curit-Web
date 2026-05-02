// ================================================================
// AUDIT REPOSITORY — Data access layer for AuditTrail model
// ================================================================
import { prisma } from '../config/database.js';

export function create(data: {
  userId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}) {
  return prisma.auditTrail.create({
    data: {
      userId: data.userId ?? null,
      action: data.action,
      resourceType: data.resourceType ?? null,
      resourceId: data.resourceId ?? null,
      details: data.details ?? null,
      ipAddress: data.ipAddress ?? null,
    },
  });
}

export function findMany(options: {
  userId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  const { userId, action, limit = 50, offset = 0 } = options;
  return prisma.auditTrail.findMany({
    where: {
      ...(userId && { userId }),
      ...(action && { action }),
    },
    orderBy: { performedAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      user: { select: { fullName: true, email: true } },
    },
  });
}
