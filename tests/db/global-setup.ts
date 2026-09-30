import { execSync } from 'node:child_process';

/**
 * Prépare la base de test : `prisma migrate reset` rejoue les 5 migrations sur
 * une base VIDÉE. Garde-fous :
 *  - TEST_DATABASE_URL obligatoire (sinon les tests DB sont ignorés) ;
 *  - refus si elle désigne la même base que DATABASE_URL / DIRECT_URL.
 *
 * Utilisez un projet Supabase dédié aux tests, en connexion directe (port 5432).
 */
export default function setup() {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    console.warn('\n⚠ TEST_DATABASE_URL absent : tests d’intégration base de données ignorés.\n');
    return;
  }

  const sameDatabase = (other?: string) => {
    if (!other) return false;
    const a = new URL(testUrl);
    const b = new URL(other);
    return a.hostname === b.hostname && a.pathname === b.pathname && a.username === b.username;
  };
  if (sameDatabase(process.env.DIRECT_URL) || sameDatabase(process.env.MAIN_DATABASE_URL)) {
    throw new Error('TEST_DATABASE_URL désigne la base principale : refus de la réinitialiser.');
  }

  execSync('npx prisma migrate reset --force --skip-seed --skip-generate', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: testUrl,
      DIRECT_URL: testUrl,
      SHADOW_DATABASE_URL: '',
    },
  });
}
