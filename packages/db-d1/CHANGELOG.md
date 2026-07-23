# @lucidcms/db-d1

## v0.2.0

- Set `caseInsensitiveLikeOperator` configuration for core.
- Added `real` data type support.
- Bumped `@lucidcms/core` to `0.16.0-alpha.0`.

## v0.1.2

- Bumped `@lucidcms/core` to `0.15.0-alpha.0`.

## v0.1.1

- Fixed `dropAllTables` so it disables foreign key constraints before dropping tables. Allows us to drop tables even when tables contain circular references.
- Bumped `@lucidcms/core` to `0.14.0-alpha.0`.

## v0.1.0

- Initial beta release of the Cloudflare D1 database adapter.
