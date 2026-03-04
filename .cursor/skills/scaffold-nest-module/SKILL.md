---
name: scaffold-nest-module
description: Scaffold a complete NestJS module following the PI Planning clean architecture (api/core/infra) with Drizzle ORM. Creates domain entity, repository interface, use-cases, Drizzle schema, Drizzle repository, controller, DTOs, and NestJS module file. Invoke when adding a new domain concept (e.g., "add team module", "create sprint API").
---

# Scaffold NestJS Clean Architecture Module (Drizzle)

Scaffold a new domain module for the PI Planning NestJS backend following clean architecture.

## Core Principle

**`/core` has ZERO external dependencies.** It defines interfaces; `/infra` implements them with Drizzle.
Dependency direction: `api` → `core` ← `infra`

## What to Create

Given a module name `<module>` (e.g., `sprint`, `feature`, `story`):

### 1. Core Domain Entity — pure TypeScript
`apps/api/src/core/domain/entities/<module>.ts`
- Plain TypeScript class, no decorators whatsoever
- Constructor with all fields typed

### 2. Repository Interface — pure TypeScript
`apps/api/src/core/repositories/<module>.repository.interface.ts`
- `I<Module>Repository` interface with async methods returning domain entities
- Export `<MODULE>_REPOSITORY` Symbol for DI token

### 3. Use-Cases — pure TypeScript
`apps/api/src/core/use-cases/<module>/`
- `create-<module>.use-case.ts`, `update-<module>.use-case.ts`, `delete-<module>.use-case.ts`, `find-<module>.use-case.ts`
- Each: `@Injectable()`, inject via `@Inject(<MODULE>_REPOSITORY)` Symbol token
- Depends only on `I<Module>Repository` interface — never on Drizzle

### 4. Drizzle Schema
`apps/api/src/infra/database/drizzle/schema/<module>.schema.ts`
- `pgTable()` definition with all fields
- Export `type <Module>Row` and `type New<Module>Row`

### 5. Drizzle Repository — implements core interface
`apps/api/src/infra/database/drizzle/repositories/<module>.drizzle-repository.ts`
- `implements I<Module>Repository`
- `@Inject(DRIZZLE_CLIENT)` for db injection
- `toDomain()` and `toRow()` private mappers

### 6. API Layer
`apps/api/src/api/modules/<module>/`
- `<module>.controller.ts` — REST endpoints, delegates to use-cases only
- `dto/create-<module>.dto.ts` — with class-validator
- `dto/update-<module>.dto.ts`
- `dto/<module>-response.dto.ts`
- `<module>.module.ts` — `{ provide: <MODULE>_REPOSITORY, useClass: <Module>DrizzleRepository }`

## Hard Rules

- **Never import Drizzle in `/core`**
- **Never import NestJS in domain entities**
- **Never inject DrizzleRepository directly into a use-case** — always via the interface Symbol
- DTOs validate with `class-validator` decorators
- Controller only handles HTTP: parse → use-case → response DTO
