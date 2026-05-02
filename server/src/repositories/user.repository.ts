// ================================================================
// USER REPOSITORY — Data access layer for User model
// Isolates Prisma queries from business logic
// ================================================================
import { prisma } from '../config/database.js';
import type { UserRole } from '@prisma/client';

/** Fields to expose in API responses (never expose passwordHash) */
const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  institutionId: true,
  institution: { select: { id: true, name: true } },
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  userModules: {
    select: {
      moduleId: true,
      status: true,
      completedAt: true,
      module: { select: { id: true, title: true } },
    },
  },
} as const;

export function findByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function findById(id: string) {
  return prisma.user.findUnique({ where: { id }, select: USER_SELECT });
}

export function findByIdFull(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export function findByRefreshToken(hashedToken: string) {
  return prisma.user.findFirst({
    where: { refreshToken: hashedToken, isActive: true },
  });
}

export function findMany(filters?: { role?: UserRole; institutionId?: string }) {
  return prisma.user.findMany({
    where: {
      ...(filters?.role && { role: filters.role }),
      ...(filters?.institutionId && { institutionId: filters.institutionId }),
    },
    select: USER_SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

export function create(data: {
  email: string;
  passwordHash: string;
  fullName: string;
  role?: UserRole;
  institutionId?: string | null;
  refreshToken?: string | null;
}) {
  return prisma.user.create({
    data: {
      email: data.email,
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      role: data.role ?? 'student',
      institutionId: data.institutionId ?? null,
      refreshToken: data.refreshToken ?? null,
    },
  });
}

export function createWithSelect(data: {
  email: string;
  passwordHash: string;
  fullName: string;
  role?: UserRole;
  institutionId?: string | null;
}) {
  return prisma.user.create({
    data: {
      email: data.email,
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      role: data.role ?? 'student',
      institutionId: data.institutionId ?? null,
    },
    select: USER_SELECT,
  });
}

export function update(id: string, data: Record<string, unknown>) {
  return prisma.user.update({ where: { id }, data });
}

export function updateWithSelect(id: string, data: Record<string, unknown>) {
  return prisma.user.update({ where: { id }, data, select: USER_SELECT });
}

// ─── UserModule operations ───

export function findUserModule(userId: string, moduleId: string) {
  return prisma.userModule.findUnique({
    where: { userId_moduleId: { userId, moduleId } },
  });
}

export function createUserModule(data: {
  userId: string;
  moduleId: string;
  status: 'enrolled' | 'in_progress' | 'completed';
  completedAt?: Date | null;
}) {
  return prisma.userModule.create({ data });
}

export function updateUserModule(
  userId: string,
  moduleId: string,
  data: { status: string; completedAt: Date | null }
) {
  return prisma.userModule.update({
    where: { userId_moduleId: { userId, moduleId } },
    data,
  });
}
