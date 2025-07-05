# Lucid - Cloudflare Worker Adapter 

> The official Cloudflare Worker adapter for Lucid CMS

## Installation

```bash
npm install @lucidcms/cloudflare-adapter
```

## lucid.config.ts/js

```typescript
import { cloudflareAdapter, defineConfig } from "@lucidcms/cloudflare-adapter";

export const adapter = cloudflareAdapter();

export default defineConfig((env) => ({
    // ...config
});
```

## Wrangler

```jsonc
{
    "$schema": "../../node_modules/wrangler/config-schema.json",
    "name": "lucid-cms",
    "main": "dist/server.js",
    "compatibility_date": "2025-06-12",
    "compatibility_flags": [
        "nodejs_compat"
    ],
    "assets": {
        "directory": "./dist/public/",
        "binding": "ASSETS",
    },
    "triggers": {
        "crons": [
            "0 0 * * *"
        ]
    },
    "build": {
        "watch_dir": "./src",
        "command": "lucidcms build --cache-spa --silent",
        "cwd": "./"
    }
}
```
