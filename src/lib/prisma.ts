import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Adresse de connexion du site.
 *
 * Sur Vercel (serverless), le pooler Supabase en MODE SESSION (port 5432)
 * réserve une connexion par client pour toute sa durée de vie : quelques
 * instances suffisent à atteindre la limite (« EMAXCONNSESSION, pool_size: 15 »).
 * Le MODE TRANSACTION (port 6543) ne prête une connexion que le temps d'une
 * requête. On y bascule donc automatiquement sur Vercel, avec pgbouncer=true
 * (pas de requêtes préparées, exigé par ce mode). Les migrations utilisent
 * DIRECT_URL et ne sont pas concernées ; en local, rien ne change.
 */
export function runtimeDatabaseUrl(raw = process.env.DATABASE_URL, onVercel = Boolean(process.env.VERCEL)): string | undefined {
  if (!raw || !onVercel) return raw;
  try {
    const url = new URL(raw);
    if (!url.hostname.endsWith('.pooler.supabase.com') || url.port !== '5432') return raw;
    url.port = '6543';
    url.searchParams.set('pgbouncer', 'true');
    if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '5');
    if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '20');
    return url.toString();
  } catch {
    return raw;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: runtimeDatabaseUrl(),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
