# Lucid CMS - Cloudflare D1 Database Adapter
> The official Cloudflare D1 database adapter for Lucid CMS

> [!CAUTION]
> This adapter is currently in beta. D1 does not support Lucid's transaction layer, so failed multi-step writes may leave partial data behind.

The Lucid CMS D1 database adapter allows you to use Cloudflare D1 as your database when running Lucid on Cloudflare Workers.

## Installation

```bash
npm install @lucidcms/db-d1
```

## Setup

```typescript
import { configureLucid } from "@lucidcms/core";
import { cloudflare } from "@lucidcms/runtime-cloudflare";
import { d1 } from "@lucidcms/db-d1";

export default configureLucid({
	runtime: cloudflare,
	db: d1,
	config: () => ({
		// ...other config
	}),
});
```

## Configuration

The no-call `db: d1` form reads the default `LUCID_D1` binding from Lucid's resolved env and asks the Cloudflare runtime to generate the matching Wrangler D1 binding. You can also pass a binding name, Wrangler D1 details, or the D1 database binding directly.

```ts
d1({ binding: "DB" });
d1({ binding: "DB", databaseName: "lucid-db" });
d1({ database: env.DB });
d1((env) => ({ database: env.DB }));
```

Cloudflare D1 does not expose long-lived transactions. This adapter reports `transaction: false`, so Lucid services run without the service-wrapper transaction layer when this adapter is used.
