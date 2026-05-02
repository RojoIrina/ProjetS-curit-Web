// ================================================================
// USER SERVICE — CRUD operations for user management
// All mutations are admin-only (enforced in routes via middleware)
// Now uses Repository layer for data access
// ================================================================
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import * as userRepo from '../repositories/user.repository.js';
import { env } from '../config/env.js';
import { NotFoundError, ConflictError } from '../errors/AppError.js';
import type { UserRole } from '@prisma/client';

export async function listUsers(filters?: { role?: UserRole; institutionId?: string }) {
  return userRepo.findMany(filters);
}

export async function getUserById(id: string) {
  const user = await userRepo.findById(id);
  if (!user) throw new NotFoundError('Utilisateur', id);
  return user;
}

export async function createUser(data: {
  email: string;
  fullName: string;
  role: UserRole;
  institutionId?: string;
}) {
  // Check uniqueness
  const existing = await userRepo.findByEmail(data.email);
  if (existing) {
    throw new ConflictError('Un utilisateur avec cet email existe déjà');
  }

  // Generate cryptographically secure temporary password
  const tempPassword = crypto.randomBytes(12).toString('base64url');
  const passwordHash = await bcrypt.hash(tempPassword, env.BCRYPT_ROUNDS);

  const user = await userRepo.createWithSelect({
    email: data.email,
    fullName: data.fullName,
    role: data.role,
    institutionId: data.institutionId ?? null,
    passwordHash,
  });

  // Return user + temp password (only shown once)
  return { user, temporaryPassword: tempPassword };
}

export async function updateUser(
  id: string,
  data: { email?: string; fullName?: string; role?: UserRole; isActive?: boolean }
) {
  // Check existence
  const existing = await userRepo.findByIdFull(id);
  if (!existing) throw new NotFoundError('Utilisateur', id);

  // Check email uniqueness if changing
  if (data.email && data.email !== existing.email) {
    const conflict = await userRepo.findByEmail(data.email);
    if (conflict) throw new ConflictError('Un utilisateur avec cet email existe déjà');
  }

  return userRepo.updateWithSelect(id, {
    ...(data.email && { email: data.email }),
    ...(data.fullName && { fullName: data.fullName }),
    ...(data.role && { role: data.role }),
    ...(data.isActive !== undefined && { isActive: data.isActive }),
  });
}

export async function deleteUser(id: string) {
  const existing = await userRepo.findByIdFull(id);
  if (!existing) throw new NotFoundError('Utilisateur', id);

  // Soft delete: deactivate instead of removing (preserves audit trail)
  return userRepo.updateWithSelect(id, { isActive: false });
}

/** Toggle module completion for a student */
export async function toggleModuleCompletion(userId: string, moduleId: string) {
  const existing = await userRepo.findUserModule(userId, moduleId);

  if (!existing) {
    // Enroll and mark completed
    return userRepo.createUserModule({
      userId, moduleId, status: 'completed', completedAt: new Date(),
    });
  }

  if (existing.status === 'completed') {
    // Toggle back to enrolled
    return userRepo.updateUserModule(userId, moduleId, {
      status: 'enrolled', completedAt: null,
    });
  }

  // Mark completed
  return userRepo.updateUserModule(userId, moduleId, {
    status: 'completed', completedAt: new Date(),
  });
}

