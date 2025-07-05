# Lucid - Node Adapter 

> The official Node adapter for Lucid CMS

## Installation

```bash
npm install @lucidcms/node-adapter
```

## lucid.config.ts/js

```typescript
import { nodeAdapter, defineConfig } from "@lucidcms/node-adapter";

export const adapter = nodeAdapter();

export default defineConfig((env) => ({
    // ...config,
});
```
