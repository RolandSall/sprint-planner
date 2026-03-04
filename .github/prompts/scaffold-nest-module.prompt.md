---
name: scaffold-nest-module
description: Scaffold a complete NestJS clean architecture module with Drizzle ORM for the PI Planning tool.
---

Scaffold a new NestJS domain module for the PI Planning tool following clean architecture with Drizzle ORM.

The module name is: $MODULE_NAME

## Core Principle

`/core` has ZERO external dependencies. It defines interfaces; `/infra` implements them with Drizzle.
Direction: `api` → `core` ← `infra`

Create the following files:

1. **Core domain entity** — `apps/api/src/core/domain/entities/$MODULE_NAME.ts`
   - Plain TypeScript class, no decorators, constructor with all fields

2. **Repository interface** — `apps/api/src/core/repositories/$MODULE_NAME.repository.interface.ts`
   - `I<Module>Repository` interface returning domain entities
   - Export `<MODULE>_REPOSITORY` Symbol

3. **Use-cases** — `apps/api/src/core/use-cases/$MODULE_NAME/`
   - `create-$MODULE_NAME.use-case.ts`, `update-$MODULE_NAME.use-case.ts`, `delete-$MODULE_NAME.use-case.ts`, `find-$MODULE_NAME.use-case.ts`
   - Each: `@Injectable()`, inject via `@Inject(<MODULE>_REPOSITORY)` Symbol — no Drizzle dependency

4. **Drizzle schema** — `apps/api/src/infra/database/drizzle/schema/$MODULE_NAME.schema.ts`
   - `pgTable()` definition, export `type <Module>Row` and `type New<Module>Row`

5. **Drizzle repository** — `apps/api/src/infra/database/drizzle/repositories/$MODULE_NAME.drizzle-repository.ts`
   - `implements I<Module>Repository`
   - `@Inject(DRIZZLE_CLIENT)` for db
   - `toDomain()` and `toRow()` private mappers

6. **NestJS module** — `apps/api/src/api/modules/$MODULE_NAME/`
   - `$MODULE_NAME.controller.ts` — REST endpoints
   - `dto/create-$MODULE_NAME.dto.ts`, `dto/update-$MODULE_NAME.dto.ts`, `dto/$MODULE_NAME-response.dto.ts`
   - `$MODULE_NAME.module.ts` — `{ provide: <MODULE>_REPOSITORY, useClass: <Module>DrizzleRepository }`

Constraints:
- Never import Drizzle in `/core`
- Never import NestJS in domain entities
- Always inject via Symbol token
- DTOs use `class-validator`
