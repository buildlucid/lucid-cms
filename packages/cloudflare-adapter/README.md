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
