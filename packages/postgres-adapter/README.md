# Lucid - Postgres Adapter 

> The official Postgres adapter for Lucid CMS

This package exports the Postgres adapter for Lucid CMS.

## Installation

```bash
npm install @lucidcms/postgres-adapter
```

## lucid.config.ts/js

```typescript
import PostgresAdapter from "@lucidcms/postgres-adapter"

export default lucid.config({
	db: new PostgresAdapter({
		connectionString: ""
	}),
    // ...other config
});
```
