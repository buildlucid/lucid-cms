# @lucidcms/plugin-typesense

## v0.2.0 (unreleased)

- Media sources now index library media only, leaving out personal and system media.
- Collection sources now project filled content API documents instead of `refs`, with a new `depth` option.
- Added `lucidcms typesense:rebuild` and `typesense:status` commands.
- Added a search index rebuild tile to System → Operations.
- Sync now backs off when Typesense can't be reached, through a new `typesense:reconcile` schedule that owns retries and failure notifications.

## v0.1.0

- The initial release
- Bumped `@lucidcms/core` to `0.19.0-alpha.0`.
