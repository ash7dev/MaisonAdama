import type { AdminRole } from '@prisma/client';

export const ROLE_LABEL: Record<AdminRole, string> = {
  OWNER: 'Propriétaire',
  STAFF: 'Équipe',
};
