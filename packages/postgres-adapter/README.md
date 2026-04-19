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
import { configureLucid } from "@lucidcms/core";

export default configureLucid({
    adapter: {
        module: "@lucidcms/node-adapter",
    },
    database: {
        module: "@lucidcms/postgres-adapter",
        options: (env) => ({
            url: env.DATABASE_URL,
        }),
    },
    config: () => ({
        // ...other config
    }),
});
```

## Configuration

The adapter constructor accepts a single configuration object via `database.options`:

```ts
{
    url: string,
    ...postgresClientOptions,
}
```

This uses the [Postgres](https://github.com/porsager/postgres) library under the hood, so every property other than `url` is passed directly through as a Postgres client option.
