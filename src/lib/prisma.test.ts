import { describe, expect, it } from 'vitest';
import { runtimeDatabaseUrl } from './prisma';

const SESSION = 'postgresql://postgres.abc:secret@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?connection_limit=5&pool_timeout=20';

describe('runtimeDatabaseUrl', () => {
  it('sur Vercel, bascule le pooler en mode transaction (6543, pgbouncer)', () => {
    const url = new URL(runtimeDatabaseUrl(SESSION, true)!);
    expect(url.port).toBe('6543');
    expect(url.searchParams.get('pgbouncer')).toBe('true');
    expect(url.searchParams.get('connection_limit')).toBe('5');
    expect(url.password).toBe('secret');
  });

  it('en local, ne change rien', () => {
    expect(runtimeDatabaseUrl(SESSION, false)).toBe(SESSION);
  });

  it('ne touche pas une adresse déjà en mode transaction ou hors pooler', () => {
    const tx = SESSION.replace(':5432/', ':6543/');
    expect(runtimeDatabaseUrl(tx, true)).toBe(tx);
    const direct = 'postgresql://u:p@db.example.com:5432/postgres';
    expect(runtimeDatabaseUrl(direct, true)).toBe(direct);
  });
});
