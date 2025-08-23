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
import { nodeAdapter, defineConfig } from "@lucidcms/node-adapter";
import LucidPages from "@lucidcms/plugin-pages";

export const adapter = nodeAdapter();

export default defineConfig((env) => ({
    // ...other config
    plugins: [
        LucidPages({
            collections: [{
                collectionKey: "page",
                useTranslations: true,
                displayFullSlug: true,
            }],
        }),
    ],
}));
```

## Configuration

This plugin offers several configuration options to control its behavior. Aside from the `collectionKey`, all of these options are optional and have default values.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `collectionKey` | `string` | - | The key of the collection that you wish to enable the plugin on |
| `useTranslations` | `boolean` | `false` | If set to `true`, the plugin will enable translations for the `slug` and `fullSlug` fields |
| `displayFullSlug` | `boolean` | `false` | If set to `true`, the plugin will make the `fullSlug` field visible in the documents page builder |

### useTranslations

If set to `true`, the plugin will enable translations for the `slug` and `fullSlug` fields. This means that in the documents page builder, the `slug` and `fullSlug` fields will require translations for each locale that you have registered in your Lucid CMS config file.

### displayFullSlug

If set to `true`, the plugin will make the `fullSlug` field visible in the documents page builder, along with making it filterable and listable in the document listing. This is mostly intended for testing and development purposes, though there is no reason it can't be used in production. Please note, however, that the `fullSlug` field is always calculated, meaning it is not possible to edit this via the document page builder, and even if this option is set to `true`, the field will be disabled.