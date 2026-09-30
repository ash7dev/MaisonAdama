import path from 'node:path';
import { defineConfig } from 'vitest/config';

try {
  process.loadEnvFile(path.join(__dirname, '.env.local'));
} catch {
  // Pas de .env.local (CI) : variables fournies par l'environnement.
}

// Mémorise la base principale AVANT toute substitution : le global-setup refuse
// de réinitialiser une base de test qui serait en fait celle-ci.
process.env.MAIN_DATABASE_URL ??= process.env.DATABASE_URL;

const alias = { '@': path.resolve(__dirname, 'src') };

export default defineConfig({
  test: {
    // Les tests d'intégration partagent une base : fichiers exécutés l'un après l'autre.
    fileParallelism: false,
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'db',
          environment: 'node',
          include: ['tests/db/**/*.test.ts'],
          globalSetup: ['tests/db/global-setup.ts'],
          testTimeout: 30_000,
          hookTimeout: 120_000,
          // src/lib/prisma.ts lit DATABASE_URL : on le fait pointer vers la base de test.
          env: process.env.TEST_DATABASE_URL ? { DATABASE_URL: process.env.TEST_DATABASE_URL } : {},
        },
      },
    ],
  },
});
