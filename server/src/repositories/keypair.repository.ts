// ================================================================
// KEYPAIR REPOSITORY — Data access layer for KeyPair model
// ================================================================
import { prisma } from '../config/database.js';

export function findActiveByInstitution(institutionId: string) {
  return prisma.keyPair.findFirst({
    where: { institutionId, isActive: true },
  });
}
