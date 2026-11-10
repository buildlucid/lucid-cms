# @lucidcms/typesense

## v0.20.0 (unreleased)

### Features:

- Added `lucidcms typesense:rebuild` and `typesense:status` commands.
- Added a search index rebuild tile to System → Operations.
- Sync now backs off when Typesense can't be reached, through a new `typesense:reconcile` schedule that owns retries and failure notifications.

### Breaking Changes:

- Renamed from `@lucidcms/plugin-typesense` to `@lucidcms/typesense`, and versions now match `@lucidcms/core`.
- Media sources now index library media only, leaving out personal and system media.
- Collection sources now project filled content API documents instead of `refs`, with a new `depth` option.
