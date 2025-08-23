# Lucid CMS - SQLite Adapter 

> The official SQLite adapter for Lucid CMS

The Lucid CMS SQLite adapter allows you to use SQLite as your database. This is ideal for local development. This registers a [SQLite dialect](https://kysely-org.github.io/kysely-apidoc/classes/SqliteDialect.html) for [Kysely](https://kysely.dev/) under the hood and utilizes the [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) library.

## Installation

```bash
npm install @lucidcms/sqlite-adapter
```

## Setup

To use the SQLite adapter, you must add it to your Lucid CMS configuration file.

```typescript
import { nodeAdapter, defineConfig } from "@lucidcms/node-adapter";
import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import Database from "better-sqlite3";

export const adapter = nodeAdapter();

export default defineConfig((env) => ({
    db: new SQLiteAdapter({
        database: async () => new Database("db.sqlite"),
    }),
    // ...other config
}));
```

## Configuration

The adapter accepts a configuration object with the following options:

| Property | Type | Description |
|----------|------|-------------|
| `database` * | `() => Promise<Database> \| Database` | A function that returns a better-sqlite3 Database instance or a Database instance |
| `onCreateConnection` | `(connection: Database) => void` | A function that is called when a connection is created on the first query |
