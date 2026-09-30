import { describe, expect, it } from 'vitest';
import { withAdmin } from '@/lib/db-context';
import { createAdmin, createProduct, HAS_DB, prisma, restockRaw } from './helpers';

describe.runIf(HAS_DB)('audit', () => {
  it('trace un changement de prix : colonnes modifiées seulement, avec l’admin', async () => {
    const { variantId } = await createProduct({ price: 25000 });
    const admin = await createAdmin();

    await withAdmin(admin, (tx) => tx.productVariant.update({ where: { id: variantId }, data: { price: 27000 } }));

    const log = await prisma.auditLog.findFirstOrThrow({
      where: { tableName: 'product_variants', recordId: variantId, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toMatchObject({ adminId: admin, oldData: { price: 25000 }, newData: { price: 27000 } });
  });

  it('n’audite pas les mouvements de stock (déjà journalisés dans stock_movements)', async () => {
    const { variantId } = await createProduct();
    const before = await prisma.auditLog.count({ where: { recordId: variantId, action: 'UPDATE' } });
    await restockRaw(variantId, 5);
    expect(await prisma.auditLog.count({ where: { recordId: variantId, action: 'UPDATE' } })).toBe(before);
  });

  it('rend le journal d’audit immuable', async () => {
    const log = await prisma.auditLog.findFirstOrThrow();
    await expect(prisma.auditLog.delete({ where: { id: log.id } })).rejects.toThrow(/\[MA020\]/);
    await expect(prisma.auditLog.update({ where: { id: log.id }, data: { adminId: null } })).rejects.toThrow(/\[MA020\]/);
  });
});

describe.runIf(HAS_DB)('sécurité', () => {
  it('active la RLS sur toutes les tables du schéma public', async () => {
    const withoutRls = await prisma.$queryRaw<{ relname: string }[]>`
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity`;
    expect(withoutRls).toEqual([]);
  });

  it('ne laisse aucune fonction du schéma public exécutable par PUBLIC (RPC Supabase)', async () => {
    const exposed = await prisma.$queryRaw<{ proname: string }[]>`
      SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
         AND (p.proacl IS NULL
              OR EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'))`;
    expect(exposed).toEqual([]);
  });

  it('ne donne aucun droit aux rôles API de Supabase (si présents)', async () => {
    const leaks = await prisma.$queryRaw<{ role: string; table: string }[]>`
      SELECT r.rolname AS "role", c.relname AS "table"
        FROM pg_roles r
       CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE r.rolname IN ('anon', 'authenticated')
         AND n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v')
         AND (has_table_privilege(r.oid, c.oid, 'SELECT') OR has_table_privilege(r.oid, c.oid, 'INSERT')
              OR has_table_privilege(r.oid, c.oid, 'UPDATE') OR has_table_privilege(r.oid, c.oid, 'DELETE'))`;
    expect(leaks).toEqual([]);
  });

  it('garde l’invariant de stock sur toute la base', async () => {
    expect(await prisma.$queryRaw`SELECT * FROM stock_ledger_discrepancies()`).toEqual([]);
  });
});
