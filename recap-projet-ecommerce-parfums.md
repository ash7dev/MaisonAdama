# Projet e-commerce Parfums — Récapitulatif complet du cadrage

> **Statut :** Cadrage terminé et validé. Prochaine étape : ERD + schéma Prisma (Phase 3).
> **Date :** 29 septembre 2026

---

## Sommaire

1. [Vision du projet](#1-vision-du-projet)
2. [Méthode : l'ordre de conception](#2-méthode--lordre-de-conception)
3. [Produits vendus](#3-produits-vendus)
4. [Architecture du catalogue](#4-architecture-du-catalogue)
5. [Variantes et contenances](#5-variantes-et-contenances)
6. [Gestion du stock](#6-gestion-du-stock)
7. [Promotions](#7-promotions)
8. [Parcours client (sans compte)](#8-parcours-client-sans-compte)
9. [Commandes et statuts](#9-commandes-et-statuts)
10. [Paiement](#10-paiement)
11. [Livraison](#11-livraison)
12. [Clients](#12-clients)
13. [Lignes de commande](#13-lignes-de-commande)
14. [Espace administrateur](#14-espace-administrateur)
15. [Règles transverses](#15-règles-transverses)
16. [Entités du modèle de données](#16-entités-du-modèle-de-données)
17. [Architecture technique](#17-architecture-technique)
18. [Stack technique](#18-stack-technique)
19. [Stockage des images](#19-stockage-des-images)
20. [Roadmap](#20-roadmap)
21. [Tableau des décisions](#21-tableau-des-décisions)
22. [Points à valider avec le vendeur](#22-points-à-valider-avec-le-vendeur)
23. [Évolutions prévues (hors MVP)](#23-évolutions-prévues-hors-mvp)
24. [Prochaine étape](#24-prochaine-étape)

---

## 1. Vision du projet

Créer un site e-commerce pour un vendeur de parfums et de produits parfumés au Sénégal. Elixyrs – Shop sert de référence d'inspiration, sans copie : l'expérience doit être adaptée au vendeur et au marché sénégalais.

Le site doit permettre de :

- découvrir les produits ;
- rechercher et filtrer les produits ;
- consulter les fiches produits ;
- choisir une contenance lorsqu'il y en a plusieurs ;
- ajouter au panier ;
- passer commande **sans créer de compte** ;
- choisir son mode de livraison ;
- choisir son mode de paiement ;
- recevoir une confirmation de commande ;
- permettre au vendeur de gérer toute son activité depuis un **espace administrateur**.

---

## 2. Méthode : l'ordre de conception

On ne commence pas par le code. L'ordre retenu :

```
1. Comprendre le business          ✅
2. Définir les fonctionnalités     ✅
3. Définir les parcours            ✅
4. Concevoir le modèle de données  ⏭️ prochaine étape
5. Définir l'architecture          (orientations déjà prises)
6. Choisir définitivement la stack (orientations déjà prises)
7. UX/UI Design
8. Développement
9. Tests
10. Déploiement
11. Analytics & optimisation
```

**Principe :** tout ce qui impacte la structure de la base de données doit être tranché avant la Phase 3, car c'est ce qui coûte le plus cher à modifier une fois que des commandes réelles existent. Le design ou les statistiques peuvent, eux, s'affiner pendant le développement.

---

## 3. Produits vendus

Le vendeur propose plusieurs lignes de produits parfumés :

- parfums (y compris les extraits de parfum) ;
- muscs ;
- huiles ;
- oud ;
- encens (thiouraye / bakhour — même produit, deux appellations).

---

## 4. Architecture du catalogue

### 4.1 Principe fondateur

Certains mots désignent parfois un **type de produit**, parfois une **note olfactive** :

- une huile de musc est un *produit* musc ;
- un parfum boisé avec une note de musc reste un *parfum*.

Mélanger ces deux sens dans une seule table rendrait le catalogue incohérent. On sépare donc trois notions :

| Notion | Question | Rôle | Cardinalité |
|---|---|---|---|
| **Catégorie** | Qu'est-ce que c'est ? | Navigation, URLs, fil d'Ariane | 1 catégorie par produit |
| **Attributs** | Comment est-ce ? | Filtres | Variable |
| **Collections** | Pourquoi le mettre en avant ? | Merchandising, page d'accueil | Many-to-many |

### 4.2 Catégories (validé)

Arborescence **plate, sur un seul niveau** :

```
Parfums
Muscs
Huiles
Oud
Encens
```

Règles :

- chaque produit appartient à **une seule** catégorie ;
- les catégories sont modifiables depuis l'admin ;
- un champ `parentId` est prévu dans le schéma mais **non utilisé au MVP**. Si le vendeur veut plus tard des sous-catégories (ex. Parfums de marque / Parfums orientaux), ce sera une configuration dans l'admin, sans migration ;
- libellé affiché conseillé pour l'encens : **« Encens (thiouraye) »**, le terme reconnu localement ;
- les termes **« thiouraye »** et **« bakhour »** sont ajoutés comme mots-clés de recherche sur les produits concernés, pour que les deux mènent au même endroit.

**Les extraits de parfum** rejoignent la catégorie **Parfums**. Le client les trouve via le filtre de concentration.

### 4.3 Attributs (filtres)

| Attribut | Type | Détails |
|---|---|---|
| **Marque** | Table `Brand` | Optionnelle : un musc artisanal n'a souvent pas de marque |
| **Genre** | Enum `HOMME / FEMME / UNISEXE` | Nullable : un encens n'a pas de genre |
| **Familles olfactives** | Many-to-many | Un parfum peut être à la fois boisé et oriental. C'est ici que « oud » et « musc » existent en tant que *notes* |
| **Concentration** | Enum `EAU_DE_TOILETTE / EAU_DE_PARFUM / EXTRAIT` | Optionnel, **réservé à la catégorie Parfums** |

Familles olfactives de départ (liste modifiable) : Boisé, Floral, Oriental, Fruité, Épicé, Musqué, Ambré, Frais…

### 4.4 Collections

Mises en avant commerciales gérées par le vendeur, indépendantes des catégories. Exemples :

- Nouveautés ;
- Best-sellers ;
- Idées cadeaux ;
- Sélection Tabaski / Korité.

Sans cette notion, le vendeur finirait par créer de fausses catégories pour ses opérations commerciales.

---

## 5. Variantes et contenances

### 5.1 Structure

La contenance n'est **pas** le produit. Un produit possède une ou plusieurs variantes :

```
Product : Dior Sauvage
   ↓
ProductVariant
   ├── 30 ml  → 25 000 FCFA
   ├── 50 ml  → 35 000 FCFA
   └── 100 ml → 50 000 FCFA
```

Un produit sans choix de contenance a **une seule variante** : la logique reste identique partout (panier, stock, commande).

### 5.2 Contenance générique

Les unités diffèrent selon le type de produit : millilitres pour les parfums, muscs et huiles ; grammes ou pot pour l'encens et le bois d'oud. La variante ne doit donc pas avoir un champ `ml` en dur.

| Champ | Exemple | Rôle |
|---|---|---|
| `size` | `50` | Valeur numérique, pour le tri |
| `unit` | `ML` / `G` / `UNITE` | Unité |
| `label` | « 50 ml », « Pot 100 g » | Texte affiché au client |

### 5.3 Chaque variante porte

- son prix ;
- son stock ;
- sa contenance (`size`, `unit`, `label`) ;
- une référence SKU (optionnelle) ;
- un seuil d'alerte de stock bas ;
- un statut actif / inactif.

---

## 6. Gestion du stock

### 6.1 Où vit le stock

Sur la **variante** (et non sur le produit).

### 6.2 Quand le stock baisse (validé)

- **À la création de la commande**, le stock est décrémenté (réservé) ;
- l'opération se fait dans une **transaction** avec une vérification atomique (`stock >= quantité`), ce qui empêche de vendre deux fois la dernière bouteille ;
- **en cas d'annulation**, le stock est automatiquement libéré.

Pourquoi pas à la livraison ? Avec le paiement à la livraison, décrémenter si tard ferait vendre des produits déjà partis.

### 6.3 Journal des mouvements : `StockMovement`

Chaque changement de stock est tracé :

| Type | Déclencheur |
|---|---|
| `REASSORT` | Le vendeur ajoute du stock |
| `VENTE` | Création d'une commande |
| `ANNULATION` | Commande annulée, stock libéré |
| `AJUSTEMENT` | Correction manuelle (casse, inventaire…) |

Il répond à la question : « pourquoi j'ai 3 flacons alors que j'en avais 10 ? ».

### 6.4 Côté admin

- voir les stocks par produit et par variante ;
- modifier les stocks ;
- identifier les produits presque épuisés (champ `lowStockThreshold` par variante) ;
- alertes de stock bas (au minimum visuelles dans le dashboard).

---

## 7. Promotions

### 7.1 Fonctionnement MVP (validé)

| Élément | Choix |
|---|---|
| Types | `POURCENTAGE` ou `MONTANT_FIXE` |
| Cibles | Un ou plusieurs produits (toutes leurs variantes) **ou** des variantes précises |
| Période | Date de début + date de fin |
| Activation | Statut actif / inactif, géré par l'admin |
| Affichage | Prix barré + nouveau prix |
| Mode | Automatique (pas de code au MVP) |

### 7.2 Règles

- le prix barré est **calculé**, jamais stocké ;
- **conflit** : si plusieurs promotions s'appliquent à une même variante, **la plus avantageuse pour le client gagne, sans cumul** ;
- un champ `code` nullable est prévu dans le schéma, **inutilisé au MVP**, pour accueillir les codes promo en V2 sans migration douloureuse.

---

## 8. Parcours client (sans compte)

Décision clé : **aucun compte client obligatoire**, pour réduire la friction à l'achat.

```
Visite
 ↓
Catalogue / Recherche / Filtres
 ↓
Fiche produit (choix de la contenance)
 ↓
Panier
 ↓
Checkout
   - Nom
   - Téléphone
   - Zone de livraison + adresse + point de repère
 ↓
Choix du paiement (Wave ou à la livraison)
 ↓
Commande créée (stock réservé)
 ↓
Page de confirmation (+ instructions Wave si besoin)
```

Pas de : création de compte, email obligatoire, mot de passe, confirmation par email, connexion.

Un compte client optionnel pourra être proposé plus tard.

---

## 9. Commandes et statuts

### 9.1 Deux statuts séparés (validé)

Le statut de la commande et le statut du paiement sont **deux réalités différentes**, suivies séparément.

**Statut de commande :**

```
EN_ATTENTE → CONFIRMEE → EN_LIVRAISON → LIVREE
     │            │
     └────────────┴──→ ANNULEE
```

- `EN_ATTENTE` : commande reçue, pas encore vérifiée ;
- `CONFIRMEE` : le vendeur a confirmé avec le client (appel ou WhatsApp) — pratique locale qui réduit fortement les commandes fantômes en paiement à la livraison ;
- `EN_LIVRAISON` : colis parti ;
- `LIVREE` : colis remis ;
- `ANNULEE` : possible depuis `EN_ATTENTE` ou `CONFIRMEE`, libère le stock.

**Statut de paiement :**

```
NON_PAYE → PAYE
            └──→ REMBOURSE (en réserve)
```

### 9.2 Numéro de commande lisible

Format : `CMD-2026-00123`. Pratique au téléphone, sur WhatsApp, et comme référence de paiement Wave.

---

## 10. Paiement

### 10.1 Méthodes retenues

| Méthode | Statut |
|---|---|
| Paiement à la livraison | ✅ Retenu |
| Wave (code marchand du vendeur) | ✅ Retenu |
| Orange Money | ❌ Retiré du périmètre |

### 10.2 Paiement à la livraison

1. Le client commande ;
2. le livreur encaisse à la remise du colis ;
3. l'admin marque la commande comme **payée**.

### 10.3 Wave via le code marchand du vendeur

Pas d'API ni de webhook : c'est une **vérification manuelle**.

1. Le client valide sa commande ;
2. la page de confirmation affiche le **montant exact**, le **code marchand** (et/ou le QR code) et le **numéro de commande** à indiquer ;
3. le client peut saisir son numéro Wave ou l'identifiant de transaction (champ optionnel) ;
4. le vendeur vérifie la réception dans son application Wave Business ;
5. le vendeur marque la commande comme **payée** dans l'admin.

Le code marchand est stocké dans `StoreSettings`, modifiable depuis l'admin, **jamais en dur dans le code**.

### 10.4 Commandes Wave jamais payées

Au MVP : **annulation manuelle** par le vendeur, qui libère le stock. L'annulation automatique après X heures est une évolution possible.

### 10.5 Modélisation

Au MVP, les informations de paiement vivent **directement sur la commande** :

- méthode de paiement ;
- statut de paiement ;
- référence de transaction (optionnelle) ;
- date de paiement.

Une table `Payment` séparée ne se justifierait qu'avec plusieurs tentatives ou des paiements partiels, ce qui n'est pas le cas ici.

---

## 11. Livraison

### 11.1 Périmètre

Livraison **partout au Sénégal** : le système n'est pas conçu uniquement autour de Dakar.

### 11.2 Prix flexible (validé)

- table `DeliveryZone` : nom, région, frais par défaut, active / inactive ;
- entièrement **éditable depuis l'admin** (ajout de zones, modification des tarifs) ;
- la commande **copie** les frais au moment de l'achat ;
- l'admin peut **ajuster les frais sur une commande précise** (ex. localité éloignée).

Exemple de zones :

```
Dakar         → X FCFA
Thiès         → X FCFA
Saint-Louis   → X FCFA
Touba         → X FCFA
...
```

### 11.3 Adresse copiée sur la commande

- région ;
- ville / commune ;
- adresse ;
- **point de repère** — indispensable au Sénégal, où l'on se repère rarement par rue et numéro.

---

## 12. Clients

- le client invité est identifié par son **numéro de téléphone normalisé** (format `+221…`) ;
- au checkout, la fiche `Customer` est **créée ou mise à jour** ;
- le vendeur obtient ainsi l'historique complet d'un client sans que celui-ci ait créé de compte.

Informations visibles dans l'admin : nom, téléphone, adresse(s), historique des commandes.

---

## 13. Lignes de commande

Chaque `OrderItem` **enregistre ses propres valeurs au moment de l'achat** (snapshot) :

- nom du produit ;
- libellé de la variante ;
- prix unitaire ;
- remise appliquée ;
- quantité.

L'historique reste exact même si le prix change, si une promotion se termine ou si le produit est archivé. La référence vers la variante est conservée, mais n'est jamais la source du prix payé.

---

## 14. Espace administrateur

Accès via `/admin`, **authentification obligatoire** (Supabase Auth).

### 14.1 Produits

- créer, modifier, archiver ;
- publier / dépublier ;
- prix, photos, variantes, stock ;
- catégorie, marque, genre, concentration, familles olfactives, collections ;
- mots-clés de recherche.

### 14.2 Stock

- vue des stocks par variante ;
- réassort et ajustements (tracés dans `StockMovement`) ;
- produits presque épuisés.

### 14.3 Commandes

- liste et détail : client, produits, montant, paiement, livraison ;
- changement de statut de commande ;
- marquer comme payée ;
- ajuster les frais de livraison ;
- annuler (libère le stock).

### 14.4 Promotions

- créer, modifier, activer, désactiver.

### 14.5 Clients

- liste, fiche, historique des commandes.

### 14.6 Paramètres

- zones et tarifs de livraison ;
- code marchand Wave ;
- informations de la boutique (ex. numéro WhatsApp de contact).

### 14.7 Statistiques (à terme)

- chiffre d'affaires ;
- nombre de commandes ;
- panier moyen ;
- produits les plus vendus ;
- ventes par période.

### 14.8 Rôles

Un `AdminProfile` lié à l'utilisateur Supabase Auth, avec un **rôle**, au cas où le vendeur ajoute un employé plus tard.

---

## 15. Règles transverses

| Règle | Détail |
|---|---|
| **Montants en entiers FCFA** | Le franc CFA n'a pas de centimes : pas de décimales, pas d'erreurs d'arrondi |
| **Numéro de commande lisible** | `CMD-2026-00123` |
| **Pas de suppression physique** | Un produit ayant des commandes est archivé (`isArchived`), jamais supprimé |
| **Snapshots** | Prix, remises, frais de livraison et adresse sont copiés sur la commande |
| **Téléphone normalisé** | Format `+221…` pour identifier le client de façon fiable |
| **Paramètres en base** | Code marchand, contacts, zones : modifiables sans redéploiement |

---

## 16. Entités du modèle de données

### 16.1 Liste

| Entité | Rôle |
|---|---|
| `Category` | Catégorie principale (5 au lancement) |
| `Brand` | Marque (optionnelle) |
| `Product` | Produit |
| `ProductImage` | Photos du produit (ordre d'affichage) |
| `ProductVariant` | Contenance, prix, stock, SKU |
| `OlfactoryFamily` | Familles olfactives (+ table de jointure) |
| `Collection` | Mises en avant (+ table de jointure) |
| `Promotion` | Promotions (+ table des cibles produits/variantes) |
| `StockMovement` | Journal des mouvements de stock |
| `Customer` | Client invité identifié par téléphone |
| `DeliveryZone` | Zones et tarifs de livraison |
| `Order` | Commande (+ infos de paiement et de livraison) |
| `OrderItem` | Lignes de commande (snapshots) |
| `StoreSettings` | Paramètres de la boutique |
| `AdminProfile` | Profil admin lié à Supabase Auth, avec rôle |

### 16.2 Relations principales

```
Category      1 ──── n  Product
Brand         1 ──── n  Product
Product       1 ──── n  ProductImage
Product       1 ──── n  ProductVariant
Product       n ──── n  OlfactoryFamily
Product       n ──── n  Collection
Promotion     n ──── n  Product / ProductVariant
ProductVariant 1 ─── n  StockMovement
Customer      1 ──── n  Order
DeliveryZone  1 ──── n  Order
Order         1 ──── n  OrderItem
ProductVariant 1 ─── n  OrderItem
```

### 16.3 Champs clés envisagés (préliminaire, à affiner en Phase 3)

**Product** : nom, slug, description, catégorie, marque, genre, concentration, mots-clés de recherche, publié, archivé, dates.

**ProductVariant** : produit, `size`, `unit`, `label`, prix, stock, `lowStockThreshold`, SKU, actif.

**Promotion** : nom, type, valeur, début, fin, actif, `code` (nullable, V2).

**Customer** : nom, téléphone normalisé (unique), dates.

**DeliveryZone** : nom, région, frais par défaut, actif.

**Order** : numéro lisible, client, statut de commande, statut de paiement, méthode de paiement, référence de transaction, date de paiement, zone, frais de livraison (snapshot, ajustables), adresse / ville / région / point de repère (snapshot), sous-total, remise, total, dates.

**OrderItem** : commande, variante, nom du produit, libellé de variante, prix unitaire, remise, quantité (tous en snapshot).

**StockMovement** : variante, type, quantité (±), commande liée (optionnelle), note, date.

**StoreSettings** : code marchand Wave, numéro WhatsApp, informations de la boutique.

---

## 17. Architecture technique

**Next.js full-stack** : pas besoin de NestJS pour un backend séparé.

```
                    VERCEL
                      │
                   Next.js
                      │
        ┌─────────────┴─────────────┐
        │                           │
   Storefront                    Admin (/admin)
        │                           │
        └─────────────┬─────────────┘
                      │
              Server Actions
              / Route Handlers
                      │
                    Prisma
                      │
                  Supabase
          ┌───────────┼───────────┐
          │           │           │
     PostgreSQL     Auth       Storage
                   (admin)     (images)
```

Paiements autour : **Wave (code marchand, vérification manuelle)** et **paiement à la livraison**.

---

## 18. Stack technique

| Couche | Choix |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| Rendu | Server Components |
| Logique serveur | Server Actions / Route Handlers selon les besoins |
| ORM | Prisma |
| Base de données | PostgreSQL (hébergé sur Supabase) |
| Authentification | Supabase Auth (admin uniquement) |
| Stockage images | Supabase Storage |
| Hébergement | Vercel |

---

## 19. Stockage des images

**Choix : Supabase Storage.**

Besoins : photos de parfums et d'encens, images de catégories, bannières, visuels promotionnels.

| | Supabase Storage | Cloudinary |
|---|---|---|
| Intégration | Déjà dans l'écosystème | Service supplémentaire |
| Simplicité | ✅ | Plus complexe |
| Catalogue classique | Suffisant | Surdimensionné |
| Transformations avancées, vidéo, CDN média | Limité | ✅ |

Cloudinary n'apporterait de valeur qu'avec beaucoup de transformations dynamiques ou de vidéo, ce qui n'est pas le cas au MVP.

---

## 20. Roadmap

### Phase 1 — Cadrage ✅
Produits, clients, fonctionnement du vendeur, livraison, paiements, promotions, stock.
*Livrable : ce document.*

### Phase 2 — Architecture produit ✅
Pages, fonctionnalités, parcours client et admin, périmètre MVP.

### Phase 3 — Modèle de données ⏭️
Toutes les entités de la section 16, relations, contraintes, index.
*Livrable : ERD + schéma Prisma.*

### Phase 4 — Architecture technique
Structure Next.js, organisation par features, Server Actions vs Route Handlers, Prisma, Supabase, permissions admin, stockage des images, flux de paiement.

### Phase 5 — UX/UI
**Storefront :** accueil, boutique, catégories, recherche, filtres, fiche produit, panier, checkout, confirmation (avec instructions Wave).
**Admin :** dashboard, produits, stock, commandes, promotions, clients, paramètres, statistiques.

### Phase 6 — Développement
```
Base de données
 ↓
Logique métier
 ↓
Admin
 ↓
Catalogue
 ↓
Fiche produit
 ↓
Panier
 ↓
Checkout
 ↓
Paiement
 ↓
Livraison
```

### Phase 7 — Tests
Ajout au panier, variantes, stock (réservation et libération), promotions (dont conflits), commande sans compte, paiement Wave, paiement à la livraison, calcul et ajustement des frais de livraison, dashboard admin, responsive, sécurité.

### Phase 8 — Déploiement
- Next.js → Vercel ;
- PostgreSQL → Supabase ;
- images → Supabase Storage ;
- nom de domaine du vendeur.

Puis : SEO, analytics, Search Console, monitoring, sauvegardes.

---

## 21. Tableau des décisions

| Sujet | Décision | Statut |
|---|---|---|
| Architecture | Next.js full-stack + Prisma + PostgreSQL + Supabase | ✅ |
| Compte client | Aucun, achat en invité | ✅ |
| Compte admin | Obligatoire, `/admin`, Supabase Auth | ✅ |
| Catégories | Parfums, Muscs, Huiles, Oud, Encens (plat) | ✅ |
| Extraits de parfum | Dans Parfums, via le filtre concentration | ✅ (hypothèse à confirmer) |
| Thiouraye / Bakhour | Même produit, catégorie Encens + mots-clés | ✅ |
| Attributs | Marque, genre, familles olfactives, concentration | ✅ |
| Collections | Oui, séparées des catégories | ✅ |
| Variantes | Contenance générique `size` / `unit` / `label` | ✅ |
| Stock | Sur la variante, réservé à la commande, libéré à l'annulation | ✅ |
| Journal de stock | `StockMovement` | ✅ |
| Promotions | % ou fixe, produit ou variante, dates, prix barré, meilleure promo sans cumul | ✅ |
| Codes promo | Champ prévu, activé en V2 | ✅ |
| Statuts | Commande et paiement séparés | ✅ |
| Paiements | Wave (code marchand, manuel) + à la livraison | ✅ |
| Orange Money | Retiré | ✅ |
| Livraison | Tout le Sénégal, zones éditables, frais ajustables par commande | ✅ |
| Client | Identifié par téléphone normalisé | ✅ |
| Lignes de commande | Snapshots complets | ✅ |
| Montants | Entiers FCFA | ✅ |
| Images | Supabase Storage | ✅ |
| Hébergement | Vercel | ✅ |

---

## 22. Points à valider avec le vendeur

Ces points ne bloquent pas la conception : ils ajustent le contenu, pas la structure.

1. **Liste réelle des produits**, pour vérifier que les 5 catégories couvrent tout.
2. **Nature des extraits de parfum** : parfums plus concentrés (→ Parfums) ou extraits huileux en petits flacons (→ Huiles). Le modèle est identique dans les deux cas.
3. **Flacons entiers ou décants** pour les parfums de marque.
4. **Process actuel de confirmation** des commandes (appel, WhatsApp…).
5. **Liste des zones de livraison** et tarifs de départ.

---

## 23. Évolutions prévues (hors MVP)

- codes promo ;
- annulation automatique des commandes Wave non payées après X heures ;
- sous-catégories (via `parentId`) ;
- compte client optionnel ;
- notifications (WhatsApp / SMS) ;
- statistiques avancées ;
- intégration API de paiement si le vendeur change de mode d'encaissement.

---

## 24. Prochaine étape

**Phase 3 — Modèle de données** : ERD complet et schéma Prisma, champ par champ, avec contraintes, index et règles de suppression.
