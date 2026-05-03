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
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
  });
}

export function findManyActive(institutionId?: string) {
  return prisma.module.findMany({
    where: {
      isActive: true,
      ...(institutionId && { institutionId }),
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
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
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
}

export function create(data: {
  title: string;
  description?: string | null;
  content?: string;
  creditHours?: number;
  order?: number;
  duration?: number;
  isRequired?: boolean;
  institutionId: string;
}) {
  return prisma.module.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      content: data.content ?? '',
      creditHours: data.creditHours ?? 0,
      order: data.order ?? 0,
      duration: data.duration ?? 0,
      isRequired: data.isRequired ?? true,
      institutionId: data.institutionId,
    },
  });
}

export function update(id: string, data: Record<string, unknown>) {
  return prisma.module.update({ where: { id }, data });
}
