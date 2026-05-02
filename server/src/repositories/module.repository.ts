// ================================================================
// MODULE REPOSITORY — Data access layer for Module model
// ================================================================
import { prisma } from '../config/database.js';

export function findById(id: string) {
  return prisma.module.findUnique({ where: { id } });
}

export function findMany(filters?: { institutionId?: string; isActive?: boolean }) {
  return prisma.module.findMany({
    where: {
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters?.institutionId && { institutionId: filters.institutionId }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export function findManyActive(institutionId?: string) {
  return prisma.module.findMany({
    where: {
      isActive: true,
      ...(institutionId && { institutionId }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export function findWithUserModules(userId: string, institutionId?: string) {
  return prisma.module.findMany({
    where: {
      isActive: true,
      ...(institutionId && { institutionId }),
    },
    include: {
      userModules: {
        where: { userId },
        select: { status: true, completedAt: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export function create(data: {
  title: string;
  description?: string | null;
  creditHours?: number;
  institutionId: string;
}) {
  return prisma.module.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      creditHours: data.creditHours ?? 0,
      institutionId: data.institutionId,
    },
  });
}

export function update(id: string, data: Record<string, unknown>) {
  return prisma.module.update({ where: { id }, data });
}
