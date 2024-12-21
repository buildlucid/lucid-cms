# Lucid - SQLite Adapter 

> The official SQLite adapter for Lucid CMS

This package exports the SQLite adapter for Lucid CMS.

## Installation

```bash
npm install @lucidcms/sqlite-adapter
```

## lucid.config.ts/js

```typescript
import SQLiteAdapter from "@lucidcms/sqlite-adapter"

export default lucid.config({
	db: new SQLiteAdapter({
		database: async () => new Database("db.sqlite"),
	}),
    // ...other config
});
```
