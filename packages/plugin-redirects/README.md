# Lucid CMS - Redirects Plugin

> The official Redirects plugin for Lucid

The Lucid CMS Redirects plugin registers a managed `redirects` collection for sending website paths to routed Lucid documents or custom URLs.

## Installation

```bash
npm install @lucidcms/plugin-redirects
```

## Setup

Add the plugin to your Lucid config and provide the collections editors can select as destinations.

```typescript
import { configureLucid } from "@lucidcms/core";
import { redirectsPlugin } from "@lucidcms/plugin-redirects";
import { node } from "@lucidcms/runtime-node";
import { sqlite } from "@lucidcms/db-sqlite";

export default configureLucid({
	runtime: node,
  db: sqlite,
  config: () => ({
    collections: [PageCollection, PostCollection],
    plugins: [
      redirectsPlugin({
        collections: ["pages", "posts"],
      }),
    ],
  }),
});
```

Publishing environments are inferred when the selected collections use the same setup. Configure `environments` explicitly when they differ. Use `navigationGroup` to place Redirects in an existing admin group.
