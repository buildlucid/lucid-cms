# @lucidcms/pages

## v0.20.0 (unreleased)

### Features:

- Added a page path rebuild tile to System → Operations.
- Added a `pages.afterRebuildPaths` hook event, so hooks and deploys can run after a path rebuild.
- Added redirects, which replace `@lucidcms/plugin-redirects`, and pages' old paths now redirect to their current ones. `redirects: false` turns them off.

### Breaking Changes:

- Renamed from `@lucidcms/plugin-pages` to `@lucidcms/pages`, and versions now match `@lucidcms/core`.
- Renamed the `fullSlug` field to `path`, and `toolkit.pages.getByFullSlug()` to `toolkit.pages.getByPath()`.
- `toolkit.pages.getByPath()` now returns the document as the content API does, and accepts `locale`, `fallbackLocale` and `depth`.
