# Lucid CMS - SEO Plugin

> The official SEO plugin for Lucid

> **Experimental:** this package is new and may have breaking changes in any release, including minor ones. Check the changelog before you upgrade.

Adds an SEO fixed brick to your collections, with search and social metadata, images, indexing controls and structured data. Editors get live previews in the admin. Your website is responsible for rendering the metadata.

## Installation

```bash
npm install @lucidcms/seo
```

## Setup

Add the plugin to your Lucid config and choose which collections should have SEO fields.

```typescript
import { defineConfig } from "@lucidcms/core";
import { node } from "@lucidcms/node";
import { seo } from "@lucidcms/seo";
import { sqlite } from "@lucidcms/sqlite";

export default defineConfig({
  runtime: node,
  db: sqlite,
  config: () => ({
    url: "https://cms.example.com",
    // Register your collections here as usual.
    plugins: [
      seo({
        collections: [{ key: "page" }],
      }),
    ],
  }),
});
```

The plugin registers its admin components and translations automatically.

## Configuration

| Property                  | Type                                                             | Description                                                             |
| ------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `collections`             | `Array<{ key: string; localized?: boolean; brickKey?: string }>` | Collections to add SEO fields to.                                       |
| `collections[].key`       | `string`                                                         | The key of an existing collection.                                      |
| `collections[].localized` | `boolean`                                                        | Whether SEO fields are localized. Defaults to the collection's setting. |
| `collections[].brickKey`  | `string`                                                         | The fixed brick key. Defaults to `seo`.                                 |
