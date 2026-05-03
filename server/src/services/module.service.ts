// ================================================================
// MODULE SERVICE — CRUD for academic modules (training units)
// Now uses Repository layer for data access
// ================================================================
import * as moduleRepo from '../repositories/module.repository.js';
import * as userRepo from '../repositories/user.repository.js';
import * as certificateService from './certificate.service.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../errors/AppError.js';

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
  content?: string;
  creditHours?: number;
  order?: number;
  duration?: number;
  isRequired?: boolean;
  institutionId: string;
}) {
  return moduleRepo.create({
    title: data.title,
    description: data.description ?? null,
    content: data.content ?? '',
    creditHours: data.creditHours ?? 0,
    order: data.order ?? 0,
    duration: data.duration ?? 0,
    isRequired: data.isRequired ?? true,
    institutionId: data.institutionId,
  });
}

export async function updateModule(
  id: string,
  data: {
    title?: string;
    description?: string;
    content?: string;
    creditHours?: number;
    order?: number;
    duration?: number;
    isRequired?: boolean;
    isActive?: boolean;
  }
) {
  const existing = await moduleRepo.findById(id);
  if (!existing) throw new NotFoundError('Module', id);

  return moduleRepo.update(id, {
    ...(data.title && { title: data.title }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.content !== undefined && { content: data.content }),
    ...(data.creditHours !== undefined && { creditHours: data.creditHours }),
    ...(data.order !== undefined && { order: data.order }),
    ...(data.duration !== undefined && { duration: data.duration }),
    ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
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
  const mod = await moduleRepo.findById(moduleId);
  if (!mod || !mod.isActive) throw new NotFoundError('Module', moduleId);

  const student = await userRepo.findByIdFull(userId);
  if (!student || student.role !== 'student') throw new NotFoundError('Étudiant', userId);
  if (student.institutionId !== mod.institutionId) {
    throw new ForbiddenError('Ce cours appartient à une autre institution');
  }

  const existing = await userRepo.findUserModule(userId, moduleId);

  if (existing) {
    return existing; // Already enrolled
  }

  return userRepo.createUserModule({
    userId, moduleId, status: 'enrolled',
  });
}

/** Mark module as completed for the authenticated student. */
export async function completeModule(userId: string, moduleId: string, issuedBy: string) {
  const mod = await moduleRepo.findById(moduleId);
  if (!mod || !mod.isActive) throw new NotFoundError('Module', moduleId);

  const student = await userRepo.findByIdFull(userId);
  if (!student || student.role !== 'student') throw new NotFoundError('Étudiant', userId);
  if (!student.institutionId || student.institutionId !== mod.institutionId) {
    throw new ForbiddenError('Ce cours n’est pas accessible pour cet étudiant');
  }

  const existing = await userRepo.findUserModule(userId, moduleId);

  if (!existing) {
    throw new ValidationError('Inscription au cours requise avant validation');
  }

  const completed = existing.status === 'completed'
    ? existing
    : await userRepo.updateUserModule(userId, moduleId, {
        status: 'completed',
        completedAt: new Date(),
      });

  const certificate = await certificateService.autoIssueIfReady(userId, mod.institutionId, issuedBy);
  return { progress: completed, certificate };
}

/** Get progress for a student across all modules */
export async function getStudentProgress(userId: string, institutionId?: string) {
  const modules = await moduleRepo.findWithUserModules(userId, institutionId);

  return modules.map(m => ({
    id: m.id,
    title: m.title,
    description: m.description,
    content: m.content,
    creditHours: m.creditHours,
    order: m.order,
    duration: m.duration,
    isRequired: m.isRequired,
    status: m.userModules[0]?.status ?? 'not_enrolled',
    completedAt: m.userModules[0]?.completedAt ?? null,
  }));
}

export async function listStudentProgress(institutionId?: string) {
  const [students, modules] = await Promise.all([
    userRepo.findStudentsWithProgress(institutionId),
    moduleRepo.findManyActive(institutionId),
  ]);
  const requiredModules = modules.filter(m => m.isRequired);
  const denominator = requiredModules.length || modules.length;
  const requiredIds = new Set((requiredModules.length ? requiredModules : modules).map(m => m.id));

  return students.map(student => {
    const completed = student.userModules.filter(
      um => um.status === 'completed' && requiredIds.has(um.moduleId)
    );
    return {
      id: student.id,
      fullName: student.fullName,
      email: student.email,
      institutionId: student.institutionId,
      completedCount: completed.length,
      totalRequired: denominator,
      percent: denominator ? Math.round((completed.length / denominator) * 100) : 0,
      modules: student.userModules.map(um => ({
        moduleId: um.moduleId,
        title: um.module.title,
        isRequired: um.module.isRequired,
        status: um.status,
        completedAt: um.completedAt,
      })),
    };
  });
}
