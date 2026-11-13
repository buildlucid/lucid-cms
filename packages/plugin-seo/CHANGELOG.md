# @lucidcms/seo

## v0.20.0 (unreleased)

### Features:

- Register localized SEO bricks with live previews, editorial guidance and metadata validation.
- Added a sitemap of your published pages at `/sitemap.xml`, which `sitemap: false` turns off.
- Added a `/robots.txt` that points crawlers at the sitemap, which `robots: false` turns off.
- Added IndexNow with `indexNow`, which tells search engines which pages changed when you publish, or when a deploy succeeds.

### Breaking Changes:

- Renamed from `@lucidcms/plugin-seo` to `@lucidcms/seo`, and versions now match `@lucidcms/core`.
- Removed the `siteUrl` option. Previews now use your config's `siteUrl`.
