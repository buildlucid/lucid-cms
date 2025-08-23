# Lucid CMS - Postgres Adapter 

> The official Postgres adapter for Lucid CMS

The Lucid CMS Postgres adapter allows you to use PostgreSQL as your database. This registers a postgres dialect for [Kysely](https://kysely.dev/) under the hood and makes use of the [Postgres](https://github.com/porsager/postgres) library.

## Installation

```bash
npm install @lucidcms/postgres-adapter
```

## Setup

To use the Postgres adapter, you need to add it to your Lucid CMS config file. You'll need to provide a PostgreSQL connection URL at a minimum.

```typescript
import { nodeAdapter, defineConfig } from "@lucidcms/node-adapter";
import PostgresAdapter from "@lucidcms/postgres-adapter";

export const adapter = nodeAdapter();

export default defineConfig((env) => ({
    db: new PostgresAdapter(env.DATABASE_URL),
    // ...other config
}));
```

## Configuration

The adapter accepts two parameters: the first is the connection string, and the second is an optional options object. This uses the [Postgres](https://github.com/porsager/postgres) library under the hood, so please refer to their documentation on the available options.