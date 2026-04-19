# Lucid CMS - SQLite Adapter 

> The official SQLite adapter for Lucid CMS

The Lucid CMS SQLite adapter allows you to use SQLite as your database. This is ideal for local development. This registers a [SQLite dialect](https://kysely-org.github.io/kysely-apidoc/classes/SqliteDialect.html) for [Kysely](https://kysely.dev/) under the hood and utilizes the [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) library.

## Installation

```bash
npm install @lucidcms/sqlite-adapter
```

## Setup

To use the SQLite adapter, you must add it to your Lucid CMS configuration file.
If you don't pass options, Lucid will instantiate `SQLiteAdapter` with the default `./db.sqlite` path.

```typescript
import { configureLucid } from "@lucidcms/core";

export default configureLucid({
    adapter: {
        module: "@lucidcms/node-adapter",
    },
    database: {
        module: "@lucidcms/sqlite-adapter",
        options: {
            database: "./db.sqlite",
        },
    },
    config: () => ({
        // ...other config
    }),
});
```

## Configuration

The adapter constructor accepts a configuration object with the following options. These are the values you pass to `database.options`.

| Property | Type | Description |
|----------|------|-------------|
| `database` | `string \| (() => Promise<Database> \| Database) \| Database` | The SQLite database path or an advanced better-sqlite3 database input |
| `onCreateConnection` | `(connection: Database) => void` | A function that is called when a connection is created on the first query |
