import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { withDbRetry } from './db-retry';

const known = (code: string) => new Prisma.PrismaClientKnownRequestError('erreur', { code, clientVersion: 'test' });

describe('withDbRetry', () => {
  it('réessaie après une coupure de connexion, puis renvoie le résultat', async () => {
    const read = vi.fn().mockRejectedValueOnce(known('P1001')).mockResolvedValueOnce('ok');
    await expect(withDbRetry(read)).resolves.toBe('ok');
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('abandonne après 3 tentatives', async () => {
    const read = vi.fn().mockRejectedValue(known('P2024'));
    await expect(withDbRetry(read)).rejects.toMatchObject({ code: 'P2024' });
    expect(read).toHaveBeenCalledTimes(3);
  });

  it('ne réessaie jamais une vraie erreur (contrainte, donnée invalide)', async () => {
    const read = vi.fn().mockRejectedValue(known('P2002'));
    await expect(withDbRetry(read)).rejects.toMatchObject({ code: 'P2002' });
    expect(read).toHaveBeenCalledTimes(1);
  });
});
