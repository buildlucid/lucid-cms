# Lucid - Postgres Adapter 

> The official Postgres adapter for Lucid CMS

> [!CAUTION]
> Some queries in Lucid are currently not working with this adapter. Full support is in the works.

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
