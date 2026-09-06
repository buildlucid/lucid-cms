# Lucid CMS - Pages Plugin

> The official Pages plugin for Lucid

The Lucid CMS Pages plugin adds support for hierarchical documents and slugs to your collections. It's ideal if you're creating content for a website and want to manage pages through collections and documents.

When enabled on a collection, it registers `fullSlug`, `slug`, and `parentPage` fields. Configured route segments add their own relation fields. These fields are used to construct the `fullSlug`, which is computed whenever a document is edited. The plugin also configures the collection to expose `fullSlug` as its public document route.

The plugin achieves this by registering hooks that fire at different points in the document lifecycle. Depending on the hook, either its `fullSlug` is updated via its ancestors, or all of its descendants' `fullSlugs` are updated.

The intended use case for this plugin is to enable easy document fetching for front-end applications, whereby you can use the URL location to filter a document via the `fullSlug`. Using the content endpoints that might look something like this:

```text
/api/v1/content/document/COLLECTION_KEY/published?filter[_fullSlug]=about
```

## Installation

```bash
npm install @lucidcms/plugin-pages
```

## Setup

To use the Pages plugin, you need to add it to your Lucid CMS config file. You will need to provide it with the necessary configuration options, such as a list of collections to enable the plugin on.

```typescript
import { defineConfig } from "@lucidcms/core";
import { node } from "@lucidcms/runtime-node";
import { pagesPlugin } from "@lucidcms/plugin-pages";
import { sqlite } from "@lucidcms/db-sqlite";

export default defineConfig({
  runtime: node,
  db: sqlite,
  config: () => ({
    plugins: [
      pagesPlugin({
        collections: [{
          key: "page",
          localized: true,
          prefix: {
            en: "en",
            fr: "fr",
          },
          ui: {
            fullSlug: true,
          },
        }],
      }),
    ],
  }),
});
```

## Configuration

This plugin offers several configuration options to control its behavior. Aside from `key`, all of these options are optional and have default values.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `key` | `string` | - | The key of the collection that you wish to enable the plugin on |
| `localized` | `boolean` | `false` | If set to `true`, the plugin will enable translations for the `slug` and `fullSlug` fields |
| `prefix` | `string \| Record<string, string>` | - | Optional prefix prepended to the start of the computed `fullSlug` for the collection |
| `segments` | `Array<{ relation: string; collection: string; field: string }>` | `[]` | Related document values inserted between the prefix and page hierarchy |
| `ui.fullSlug` | `boolean` | `false` | Shows the computed `fullSlug` field in the document builder and listing |
| `ui.placement` | `{ at: "start" \| "end"; tab?: string } \| { before: string } \| { after: string }` | `{ at: "end" }` | Places the plugin fields at the collection root, in an existing tab, or relative to another field |
| `ui.widths` | `Partial<Record<"fullSlug" \| "slug" \| "parentPage" \| "segments", FieldWidth>>` | - | Overrides the admin grid width of individual plugin fields |
| `unique` | `boolean` | `true` | Controls route uniqueness validation for computed `fullSlug` values |

### localized

If set to `true`, the plugin will enable translations for the `slug` and `fullSlug` fields. This means that in the documents page builder, the `slug` and `fullSlug` fields will require translations for each locale that you have registered in your Lucid CMS config file.

### UI

Set `ui.fullSlug` to `true` to show the computed `fullSlug` in the document builder and listing. The field remains disabled because its value is always calculated by the plugin.

Use `ui.placement` to position the generated fields as one group. The group contains `fullSlug`, `slug`, `parentPage`, then route segment relations in their configured order.

Place the fields relative to an existing root field or direct tab child:

```typescript
ui: {
  placement: {
    after: "pageTitle",
  },
}
```

An anchor inside a tab places the generated fields in that tab. To target the start or end of the collection root or a named tab directly, use `at`:

```typescript
ui: {
  placement: {
    at: "start",
    tab: "routing",
  },
}
```

The plugin throws a configuration error when the anchor or tab does not exist. Nested repeater, section, and collapsible children cannot be used as anchors.

Fields use Lucid's 12-column admin grid. When `fullSlug` is visible, it and `slug` each use half a row and `parentPage` uses a full row. Otherwise, all fields use a full row. A single route segment uses a full row; two or more use half a row each. Override individual values through `ui.widths` using `12`, `8`, `6`, `4`, or `3`.

### prefix

If set, the plugin prepends the given prefix to the start of the computed `fullSlug`. This does not change the stored `slug` value itself. You can provide either a single string for all locales, or a locale map when translations are enabled.

### segments

Segments let a page route include values owned by other collections. The plugin registers each non-localized, required single relation on the page collection. The configured field must be a top-level text, textarea, select, or number field on its target collection.

```typescript
pagesPlugin({
  collections: [{
    key: "documentation",
    prefix: "/docs",
    segments: [
      { relation: "product", collection: "products", field: "key" },
      { relation: "release", collection: "releases", field: "key" },
    ],
  }],
});
```

A page with product `lucid`, release `v1`, and slug `getting-started` resolves to `/docs/lucid/v1/getting-started`. Related target fields are fetched in batches, including when descendant routes need rebuilding. Updating a referenced segment field also rebuilds affected page routes and their descendants across mapped publishing targets.

### unique

By default, each computed `fullSlug` must be unique within the same collection, version type, and locale. This checks the computed route rather than the raw slug value.

Set `unique: false` to disable this route uniqueness validation for a collection.
