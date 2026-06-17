# Lucid CMS - LibSQL Database Adapter
> The official LibSQL database adapter for Lucid CMS

The Lucid CMS LibSQL database adapter allows you to use LibSQL as your database. This registers a slightly modified version of the [LibSQL dialect](https://github.com/tursodatabase/kysely-libsql) for [Kysely](https://kysely.dev/).

## Installation

```bash
npm install @lucidcms/db-libsql
```

## Setup

To use the LibSQL database adapter, you must add it to your Lucid CMS configuration file. You'll need to provide the database URL and, optionally, an authentication token.

```typescript
import { configureLucid } from "@lucidcms/core";
import { node } from "@lucidcms/runtime-node";
import { libsql } from "@lucidcms/db-libsql";

export default configureLucid({
	runtime: node,
	db: libsql,
	config: () => ({
		// ...other config
	}),
});
```

## Configuration

The no-call `db: libsql` form reads `LIBSQL_URL` and optional `LIBSQL_AUTH_TOKEN` from Lucid's resolved env. You can also pass a configuration object or env callback via `libsql()` with the following options:

| Property | Type | Description |
|----------|------|-------------|
| `url` * | `string` | The LibSQL database URL (e.g., `libsql://your-database.turso.io`) |
| `authToken` | `string` | Authentication token for accessing the database |
