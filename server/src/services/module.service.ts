// ================================================================
// MODULE SERVICE — CRUD for academic modules (training units)
// ================================================================
import { prisma } from '../config/database.js';
import { NotFoundError } from '../errors/AppError.js';

export async function listModules(institutionId?: string) {
  return prisma.module.findMany({
    where: {
      isActive: true,
      ...(institutionId && { institutionId }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getModuleById(id: string) {
  const mod = await prisma.module.findUnique({ where: { id } });
  if (!mod) throw new NotFoundError('Module', id);
  return mod;
}

export async function createModule(data: {
  title: string;
  description?: string;
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

export async function updateModule(
  id: string,
  data: { title?: string; description?: string; creditHours?: number; isActive?: boolean }
) {
  const existing = await prisma.module.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Module', id);

  return prisma.module.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.creditHours !== undefined && { creditHours: data.creditHours }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

export async function deleteModule(id: string) {
  const existing = await prisma.module.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Module', id);

  return prisma.module.update({
    where: { id },
    data: { isActive: false },
  });
}

/** Enroll a student in a module */
export async function enrollStudent(userId: string, moduleId: string) {
  const existing = await prisma.userModule.findUnique({
    where: { userId_moduleId: { userId, moduleId } },
  });

  if (existing) {
    return existing; // Already enrolled
  }

  return prisma.userModule.create({
    data: { userId, moduleId, status: 'enrolled' },
  });
}

/** Mark module as completed for a student */
export async function completeModule(userId: string, moduleId: string) {
  const existing = await prisma.userModule.findUnique({
    where: { userId_moduleId: { userId, moduleId } },
  });

  if (!existing) {
    // Auto-enroll and complete
    return prisma.userModule.create({
      data: { userId, moduleId, status: 'completed', completedAt: new Date() },
    });
  }

  return prisma.userModule.update({
    where: { userId_moduleId: { userId, moduleId } },
    data: { status: 'completed', completedAt: new Date() },
  });
}

/** Get progress for a student across all modules */
export async function getStudentProgress(userId: string, institutionId?: string) {
  const modules = await prisma.module.findMany({
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

  return modules.map(m => ({
    id: m.id,
    title: m.title,
    description: m.description,
    creditHours: m.creditHours,
    status: m.userModules[0]?.status ?? 'not_enrolled',
    completedAt: m.userModules[0]?.completedAt ?? null,
  }));
}
