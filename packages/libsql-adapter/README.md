# Lucid CMS - LibSQL Adapter 

> The official LibSQL adapter for Lucid CMS

The Lucid CMS LibSQL adapter allows you to use LibSQL as your database. This registers a slightly modified version of the [LibSQL dialect](https://github.com/tursodatabase/kysely-libsql) for [Kysely](https://kysely.dev/).

## Installation

```bash
npm install @lucidcms/libsql-adapter
```

## Setup

To use the LibSQL adapter, you must add it to your Lucid CMS configuration file. You'll need to provide the database URL and, optionally, an authentication token.

```typescript
import { configureLucid } from "@lucidcms/core";

export default configureLucid({
    adapter: {
        module: "@lucidcms/node-adapter",
    },
    database: {
        module: "@lucidcms/libsql-adapter",
        options: (env) => ({
            url: env.LIBSQL_URL,
            authToken: env.LIBSQL_AUTH_TOKEN,
        }),
    },
    config: () => ({
        // ...other config
    }),
});
```

## Configuration

The adapter constructor accepts a configuration object via `database.options` with the following options:

| Property | Type | Description |
|----------|------|-------------|
| `url` * | `string` | The LibSQL database URL (e.g., `libsql://your-database.turso.io`) |
| `authToken` | `string` | Authentication token for accessing the database |
