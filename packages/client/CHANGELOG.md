# @lucidcms/client

## v0.20.0 (unreleased)

### Features:

- Added a `version` option to `createClient`, which document reads use by default.
- Added `locale`, `fallbackLocale` and `depth` options to reads.
- Added `include: ["transcripts"]` to `media.getMultiple` for audio transcripts.
- Added `previewAttributes`, `recordPreviewTargets` and `getPreviewTarget` for marking fields, bricks and repeater items for visual editing.

### Breaking Changes:

- Versions now match `@lucidcms/core`.
- Document responses now come with their references filled in, instead of `refs`.
- Document reads now take `filter`, `sort`, `include`, `page` and `perPage` beside `collectionKey` instead of under `query`.
- Filters now use `fields.<field>` and `bricks.<brick>.<field>` keys, accept plain values and can be a list of filters where any may match.
- `media.getMultiple` now takes `filter`, `sort`, `include`, `page` and `perPage` directly instead of under `query`.
- `documents.getSingle` now returns `null` when nothing matches, and list reads return `items` with their `pagination`. Results no longer have `meta`, `links` or `refs`.
- Collection types now come from one `Collections` registry, which Lucid's `build.clientTypes` option writes for you.
- Removed `createDocumentView`, `createDocumentViews` and `toolbarFromToolkit`.
- `setupPreview` now loads the builder's preview runtime from the CMS at its `host` option, and `morph: true` replaces `morphPage`.
- The toolbar moved to `@lucidcms/admin/toolbar`, and `@lucidcms/client/bootstrap` was removed.
