import { Prisma } from '@prisma/client';
import { DomainError } from './errors';

/**
 * Règles métier garanties par la base (migration 20260930120200_integrity).
 * Chaque exception SQL porte son code en préfixe du message : « [MA001] … ».
 */
const DB_RULES = {
  MA001: 'STOCK_INSUFFICIENT',
  MA002: 'VARIANT_NOT_FOUND',
  MA010: 'STOCK_WRITE_FORBIDDEN',
  MA020: 'IMMUTABLE',
  MA030: 'INVALID_STATUS_TRANSITION',
  MA031: 'INVALID_PAYMENT_TRANSITION',
  MA040: 'ORDER_INCONSISTENT',
  MA041: 'PRODUCT_UNAVAILABLE',
  MA042: 'PRICE_CHANGED',
  MA043: 'SNAPSHOT_INVALID',
  MA044: 'DISCOUNT_INVALID',
  MA045: 'ORDER_LOCKED',
  MA050: 'PRODUCT_WITHOUT_ACTIVE_VARIANT',
  MA051: 'CONCENTRATION_NOT_ALLOWED',
  MA060: 'ADMIN_INACTIVE',
} as const;

export type DbRuleCode = keyof typeof DB_RULES;

export class DatabaseRuleError extends DomainError {
  constructor(
    public readonly sqlState: DbRuleCode,
    message: string,
  ) {
    super(message, DB_RULES[sqlState]);
    this.name = 'DatabaseRuleError';
  }
}

const RULE_PATTERN = /\[(MA\d{3})\]\s*([^\n"`\\]*)/;

/** Convertit une erreur Prisma issue d'une règle SQL en DatabaseRuleError ; sinon la renvoie telle quelle. */
export function toDomainError(error: unknown): unknown {
  if (error instanceof DomainError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const match = RULE_PATTERN.exec(message);
  if (match && match[1] in DB_RULES) {
    return new DatabaseRuleError(match[1] as DbRuleCode, match[2].trim());
  }
  return error;
}

/** Violation d'unicité Prisma (P2002), éventuellement sur un champ donné. */
export function isUniqueViolation(error: unknown, field?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
  if (!field) return true;
  const target = error.meta?.target;
  const targets = Array.isArray(target) ? target.map(String) : [String(target ?? '')];
  return targets.some((t) => t === field || t.includes(field));
}
