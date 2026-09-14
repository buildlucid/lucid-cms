# Lucid CMS - Typesense Plugin

> The official Typesense plugin for Lucid

Search your Lucid content with Typesense. Choose the collections, publication versions, media and fields to index. The plugin keeps them up to date as content changes, including related content used by your search records.

Updates run in the background, so search results may take a moment to reflect an edit.

## Installation

```bash
npm install @lucidcms/plugin-typesense
```

## Setup

Add the plugin to your Lucid config and provide your Typesense host and API key.

```typescript
import { defineConfig } from "@lucidcms/core";
import { sqlite } from "@lucidcms/db-sqlite";
import { typesensePlugin } from "@lucidcms/plugin-typesense";
import { node } from "@lucidcms/runtime-node";

export default defineConfig({
  runtime: node,
  db: sqlite,
  config: (env) => ({
    plugins: [
      typesensePlugin({
        host: env.TYPESENSE_HOST,
        apiKey: env.TYPESENSE_API_KEY,
        indexes: [{
          key: "pages",
          alias: "website_pages",
          schema: {
            fields: [
              { name: "title", type: "string" },
              { name: "path", type: "string" },
            ],
          },
          sources: [{
            kind: "collection",
            key: "pages",
            collection: "page",
            version: "published",
            fields: { title: "title", path: "fullSlug" },
          }],
        }],
      }),
    ],
  }),
});
```

Use a publishing target configured on your collection, or `latest` to include draft content. Run `lucidcms migrate` after adding the plugin, and enable a Lucid queue adapter for background jobs.

## Configuration

| Property | Description |
|----------|-------------|
| `host` and `apiKey` | Connect to your Typesense server. Include the protocol and port for local servers, such as `http://localhost:8108`. |
| `client` | Use your own Typesense SDK client instead of `host` and `apiKey`. |
| `indexes` | The search indexes and their content sources. Query an index using its `alias`. |
| `sources[].fields` | Map search fields to Lucid fields, or use a function to calculate a value. |
| `sources[].condition` | Choose whether to index a resource. Receives the document or media, locale, and available references. Returning `false` removes its search records. |
| `sources[].locales` | Optionally index each listed locale separately. |
| `sources[].project` | Supply a function instead of `fields` when you need more control. Return `null` to exclude an item. |

Use `kind: "media"` for a media source, with fields such as `{ title: "title", url: "url" }`. Media sources include public, ready files and use their current crop and delivery URL. Set `visibility: "all"` only for an index with suitable access controls.

For collection sources, add `include: ["bricks", "refs.documents", "refs.media"]` when your field functions use bricks or related content. These references are resolved when indexing and refreshed when their content changes.

For example, add `condition: ({ document }) => document.fields.searchable === true` to index only documents marked as searchable. Conditions run during indexing, so searches still read only Typesense.

Rich-text variables, document links and embedded media are also refreshed when their referenced content changes.

## Search and rebuilds

Use `toolkit.typesense.client` in a server route to query Typesense. Your frontend calls that route, keeping the Typesense API key on the server. Results contain the values stored in Typesense; the plugin does not fetch live content during a search.

Call `toolkit.typesense.rebuild({ index: "pages" })` after changing an index's schema or field mapping. Existing search results remain available during a rebuild. Use `toolkit.typesense.getStatus({ index: "pages" })` to check progress or the last error.
