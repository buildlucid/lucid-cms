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
import { node } from "@lucidcms/node-adapter";
import { postgres } from "@lucidcms/postgres-adapter";

export default configureLucid({
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
