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

The plugin registers its admin components and translations automatically. Previews and the sitemap build page URLs from your config's `siteUrl`.

## Configuration

| Property                  | Type                                                             | Description                                                              |
| ------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `collections`             | `Array<{ key: string; localized?: boolean; brickKey?: string }>` | Collections to add SEO fields to.                                        |
| `collections[].key`       | `string`                                                         | The key of an existing collection.                                       |
| `collections[].localized` | `boolean`                                                        | Whether SEO fields are localized. Defaults to the collection's setting.  |
| `collections[].brickKey`  | `string`                                                         | The fixed brick key. Defaults to `seo`.                                  |
| `sitemap`                 | `false \| { collections?: string[]; environment?: string }`      | Lists published pages in a sitemap. On by default. `false` turns it off. |
| `sitemap.collections`     | `string[]`                                                       | SEO collections to list. Defaults to every SEO collection with routing.  |
| `sitemap.environment`     | `string`                                                         | The environment to list. Defaults to the one your collections end in.    |
| `robots`                  | `false \| { rules?: RobotsRule[] }`                              | Serves `/robots.txt`. On by default. `false` turns it off.               |
| `robots.rules`            | `Array<{ userAgent; allow?; disallow? }>`                        | Groups that replace the default. Each value is a string or a list.       |
| `indexNow`                | `{ key: string; deploy?: string; endpoint?: string }`            | Sends changed pages to IndexNow. Off unless given. Needs the sitemap.    |

## Sitemap

The plugin lists your published pages in a sitemap, with URLs built from your config's `siteUrl`. It's on by default, and `sitemap: false` turns it off. Pages set to `noindex` or with a canonical URL elsewhere are left out.

`/sitemap.xml` is a sitemap index with one file for each collection, such as `/sitemap-page.xml`. The CMS serves them when your `siteUrl` is on its own address, and the site plugin's `site:build` writes them into static builds. Other frontends can read them with `toolkit.seo.sitemap`, `createSeoClient` from `@lucidcms/seo/client`, or the content API at `/api/v1/content/e/seo/sitemap/xml` with the `sitemap:read` scope.

When `siteUrl` gives each language its own domain, each domain gets its own sitemap of its own pages, and reads take an `origin`, such as `"https://example.fr"`, to choose one. A domain without pages has no sitemap.

To add, change or remove pages, add a `seo.sitemapEntries` hook to your config. Its handler edits `data.entries`, and an added page needs only its path, such as `data.entries.push({ path: "/search" })`.

With the Lucid site plugin, the site's own pages are listed too. A page leaves itself out with `{% export sitemap = false %}`, and one with route parameters lists its `paths` with `{% export sitemap = true %}`.

## Robots

The plugin serves a `/robots.txt` that lets every crawler in, keeps them out of the admin on the CMS's own address, and points them at that domain's sitemap. It's on by default, and `robots: false` turns it off. Give `robots.rules` to replace the default rules, such as `[{ userAgent: "*", disallow: "/search" }]`. The `Sitemap:` line is still added while the sitemap is on.

It's served and read the same ways as the sitemap: by the CMS, in static builds, with `toolkit.seo.robots.text()`, or at `/api/v1/content/e/seo/robots` with the `robots:read` scope. A `public/robots.txt` or a site page at that path wins.

Don't disallow `noindex` pages. A crawler that can't fetch a page never sees its `noindex`, so the page can stay in search results.

## IndexNow

Give `indexNow` a key of 8 to 128 letters, numbers and hyphens, such as `indexNow: { key: env.INDEXNOW_KEY }`, to tell search engines which pages changed. Each send compares the sitemap's pages with those it stored last time and marks the ones that are new, changed or gone as pending, then sends everything pending. Pages stay pending until IndexNow accepts them, so a send that fails is picked up by the next one. The first send sends every page, and pages on local hosts are never sent.

Without `deploy`, a send follows each publish, unpublish or delete in the sitemap's environment. With `deploy: "production"`, it waits for that deploy's runs to succeed instead. A deploy whose host never reports back, such as a build hook, never succeeds, so send from the IndexNow tile on System → Operations after it's live, or call `toolkit.seo.indexNow.send()`.

Search engines check your key at `/<key>.txt`. The CMS serves it when your `siteUrl` is on its own address, and `site:build` writes it into static builds. Other frontends must serve the file themselves, with the key as its only content.
