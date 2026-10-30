# Lucid CMS - Postgres Database Adapter

> The official Postgres database adapter for Lucid CMS

The Lucid CMS Postgres database adapter allows you to use PostgreSQL as your database. This registers a postgres dialect for [Kysely](https://kysely.dev/) under the hood and makes use of the [Postgres](https://github.com/porsager/postgres) library.

## Installation

```bash
npm install @lucidcms/db-postgres
```

## Setup

To use the Postgres database adapter, you need to add it to your Lucid CMS config file. You'll need to provide a PostgreSQL connection URL at a minimum.

```typescript
import { defineConfig } from "@lucidcms/core";
import { postgres } from "@lucidcms/db-postgres";
import { node } from "@lucidcms/runtime-node";

export default defineConfig({
  runtime: node,
  db: postgres,
  config: () => ({
    // ...other config
  }),
});
```

## Configuration

The no-call `db: postgres` form reads `DATABASE_URL` from Lucid's resolved env. You can also pass a configuration object or env callback via `postgres()`:

```ts
{
    url: string,
    ...postgresClientOptions,
}
```

This uses the [Postgres](https://github.com/porsager/postgres) library under the hood, so every property other than `url` is passed directly through as a Postgres client option.

## Connection poolers

Queries run as named prepared statements. Poolers in transaction mode, such as PgBouncer or Supabase's pooler on port 6543, can't keep those between transactions, so turn them off:

```ts
db: postgres((env) => ({
  url: env.DATABASE_URL,
  prepare: false,
})),
```

Migrations take a session-level lock, which a transaction-mode pooler can't hold. Run `lucidcms migrate` against a direct connection or a session-mode pooler, for example by setting `DATABASE_URL` to the direct connection for that command.
