// ================================================================
// MODULE SERVICE — CRUD for academic modules (training units)
// Now uses Repository layer for data access
// ================================================================
import * as moduleRepo from '../repositories/module.repository.js';
import * as userRepo from '../repositories/user.repository.js';
import { NotFoundError } from '../errors/AppError.js';

export async function listModules(institutionId?: string) {
  return moduleRepo.findManyActive(institutionId);
}

export async function getModuleById(id: string) {
  const mod = await moduleRepo.findById(id);
  if (!mod) throw new NotFoundError('Module', id);
  return mod;
}

export async function createModule(data: {
  title: string;
  description?: string;
  creditHours?: number;
  institutionId: string;
}) {
  return moduleRepo.create({
    title: data.title,
    description: data.description ?? null,
    creditHours: data.creditHours ?? 0,
    institutionId: data.institutionId,
  });
}

export async function updateModule(
  id: string,
  data: { title?: string; description?: string; creditHours?: number; isActive?: boolean }
) {
  const existing = await moduleRepo.findById(id);
  if (!existing) throw new NotFoundError('Module', id);

  return moduleRepo.update(id, {
    ...(data.title && { title: data.title }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.creditHours !== undefined && { creditHours: data.creditHours }),
    ...(data.isActive !== undefined && { isActive: data.isActive }),
  });
}

export async function deleteModule(id: string) {
  const existing = await moduleRepo.findById(id);
  if (!existing) throw new NotFoundError('Module', id);

  return moduleRepo.update(id, { isActive: false });
}

/** Enroll a student in a module */
export async function enrollStudent(userId: string, moduleId: string) {
  const existing = await userRepo.findUserModule(userId, moduleId);

  if (existing) {
    return existing; // Already enrolled
  }

  return userRepo.createUserModule({
    userId, moduleId, status: 'enrolled',
  });
}

/** Mark module as completed for a student */
export async function completeModule(userId: string, moduleId: string) {
  const existing = await userRepo.findUserModule(userId, moduleId);

  if (!existing) {
    // Auto-enroll and complete
    return userRepo.createUserModule({
      userId, moduleId, status: 'completed', completedAt: new Date(),
    });
  }

  return userRepo.updateUserModule(userId, moduleId, {
    status: 'completed', completedAt: new Date(),
  });
}

/** Get progress for a student across all modules */
export async function getStudentProgress(userId: string, institutionId?: string) {
  const modules = await moduleRepo.findWithUserModules(userId, institutionId);

  return modules.map(m => ({
    id: m.id,
    title: m.title,
    description: m.description,
    creditHours: m.creditHours,
    status: m.userModules[0]?.status ?? 'not_enrolled',
    completedAt: m.userModules[0]?.completedAt ?? null,
  }));
}

