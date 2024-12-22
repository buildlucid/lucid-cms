# Lucid - LibSQL Adapter 

> The official LibSQL adapter for Lucid CMS

This package exports the LibSQL adapter for Lucid CMS.

## Installation

```bash
npm install @lucidcms/libsql-adapter
```

## lucid.config.ts/js

```typescript
import LibSQLAdapter from "@lucidcms/libsql-adapter"

export default lucid.config({
	db: new LibSQLAdapter({
		url: "libsql://replace-me.turso.io",
		authToken: 'auth-token'
	}),
    // ...other config
});
```
