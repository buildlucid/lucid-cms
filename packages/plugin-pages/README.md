# Lucid CMS - Pages Plugin

> The official Pages plugin for Lucid

The Lucid CMS Pages plugin adds support for hierarchical documents and slugs to your collections. It's ideal if you're creating content for a website and want to manage pages through collections and documents.

When enabled on a collection, it registers three new fields: `fullSlug`, `slug` and `parentPage`. These fields are used to construct the `fullSlug`, which is computed whenever a document is edited. The `fullSlug` is the combination of all the parent slugs and their slugs.

The plugin achieves this by registering hooks that fire at different points in the document lifecycle. Depending on the hook, either its `fullSlug` is updated via its ancestors, or all of its descendants' `fullSlugs` are updated.

The intended use case for this plugin is to enable easy document fetching for front-end applications, whereby you can use the URL location to filter a document via the `fullSlug`. Using the client endpoints that might look something like this:

```text
/api/v1/client/document/COLLECTION_KEY/published?filter[_fullSlug]=about
```

## Installation

```bash
npm install @lucidcms/plugin-pages
```

## Setup

To use the Pages plugin, you need to add it to your Lucid CMS config file. You will need to provide it with the necessary configuration options, such as a list of collections to enable the plugin on.

```typescript
import { configureLucid } from "@lucidcms/core";
import { node } from "@lucidcms/runtime-node";
import { pagesPlugin } from "@lucidcms/plugin-pages";
import { sqlite } from "@lucidcms/db-sqlite";

export default configureLucid({
	runtime: node,
	db: sqlite,
	config: () => ({
		plugins: [
			pagesPlugin({
				collections: [{
					collectionKey: "page",
					localized: true,
					displayFullSlug: true,
					prefix: {
						en: "en",
						fr: "fr",
					},
				}],
			}),
		],
	}),
});
```

## Configuration

This plugin offers several configuration options to control its behavior. Aside from the `collectionKey`, all of these options are optional and have default values.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `collectionKey` | `string` | - | The key of the collection that you wish to enable the plugin on |
| `localized` | `boolean` | `false` | If set to `true`, the plugin will enable translations for the `slug` and `fullSlug` fields |
| `displayFullSlug` | `boolean` | `false` | If set to `true`, the plugin will make the `fullSlug` field visible in the documents page builder |
| `prefix` | `string \| Record<string, string>` | - | Optional prefix prepended to the start of the computed `fullSlug` for the collection |
| `unique` | `boolean \| { fields?: string[] }` | `true` | Controls route uniqueness validation for computed `fullSlug` values |

### localized

If set to `true`, the plugin will enable translations for the `slug` and `fullSlug` fields. This means that in the documents page builder, the `slug` and `fullSlug` fields will require translations for each locale that you have registered in your Lucid CMS config file.

### displayFullSlug

If set to `true`, the plugin will make the `fullSlug` field visible in the documents page builder, along with making it filterable and shown in the document listing. This is mostly intended for testing and development purposes, though there is no reason it can't be used in production. Please note, however, that the `fullSlug` field is always calculated, meaning it is not possible to edit this via the document page builder, and even if this option is set to `true`, the field will be disabled.

### prefix

If set, the plugin prepends the given prefix to the start of the computed `fullSlug`. This does not change the stored `slug` value itself. You can provide either a single string for all locales, or a locale map when translations are enabled.

### unique

By default, each computed `fullSlug` must be unique within the same collection, version type, tenant visibility, and locale. This checks the computed route rather than the raw slug value.

Set `unique: false` to disable this route uniqueness validation for a collection.

Use `unique: { fields: ["fieldKey"] }` to include selected top-level field values in the uniqueness check. Supported field types are `text`, `textarea`, `select`, `number`, `datetime`, `relation`, `media`, and `user`.
