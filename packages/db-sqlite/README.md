# Lucid CMS - SQLite Database Adapter
> The official SQLite database adapter for Lucid CMS

The Lucid CMS SQLite database adapter allows you to use SQLite as your database. This is ideal for local development. This registers a [SQLite dialect](https://kysely-org.github.io/kysely-apidoc/classes/SqliteDialect.html) for [Kysely](https://kysely.dev/) under the hood and utilizes the [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) library.

## Installation

```bash
npm install @lucidcms/db-sqlite
```

## Setup

To use the SQLite database adapter, you must add it to your Lucid CMS configuration file.
If you don't pass options, Lucid will instantiate `SQLiteAdapter` with the default `./db.sqlite` path.

```typescript
import { configureLucid } from "@lucidcms/core";
import { node } from "@lucidcms/runtime-node";
import { sqlite } from "@lucidcms/db-sqlite";

export default configureLucid({
	runtime: node,
	db: sqlite,
	config: () => ({
		// ...other config
	}),
});
```

## Configuration

The no-call `db: sqlite` form uses the same default as `sqlite()`: `./db.sqlite`. You can pass a configuration object to `sqlite()` when you need to override it.

| Property | Type | Description |
|----------|------|-------------|
| `database` | `string \| (() => Promise<Database> \| Database) \| Database` | The SQLite database path or an advanced better-sqlite3 database input |
| `onCreateConnection` | `(connection: Database) => void` | A function that is called when a connection is created on the first query |
