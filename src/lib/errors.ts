/**
 * Classes d'erreurs métiers du domaine E-commerce Maison Adama
 */
export class DomainError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'DOMAIN_ERROR') {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class StockInsuffisantError extends DomainError {
  constructor(public readonly variantName: string, public readonly available: number) {
    super(
      `Stock insuffisant pour la variante "${variantName}". Quantité disponible : ${available}`,
      'STOCK_INSUFFICIENT'
    );
    this.name = 'StockInsuffisantError';
  }
}

export class ProductNotFoundError extends DomainError {
  constructor(identifier: string) {
    super(`Produit introuvable : ${identifier}`, 'PRODUCT_NOT_FOUND');
    this.name = 'ProductNotFoundError';
  }
}

export class OrderNotFoundError extends DomainError {
  constructor(orderIdOrNumber: string) {
    super(`Commande introuvable : ${orderIdOrNumber}`, 'ORDER_NOT_FOUND');
    this.name = 'OrderNotFoundError';
  }
}

export class InvalidStatusTransitionError extends DomainError {
  constructor(fromStatus: string, toStatus: string) {
    super(
      `Transition de statut non autorisée : impossible de passer de "${fromStatus}" à "${toStatus}"`,
      'INVALID_STATUS_TRANSITION'
    );
    this.name = 'InvalidStatusTransitionError';
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Accès non autorisé aux fonctionnalités administrateur') {
    super(message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, public readonly errors?: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
