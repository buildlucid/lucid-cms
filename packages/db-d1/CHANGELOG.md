# @lucidcms/db-d1

## v0.4.0 (unreleased)

- Updated JSON handling to use Lucid's managed query layer, avoiding adapter-wide parsing of values that only look like JSON.

## v0.3.0

- Bumped `@lucidcms/core` to `0.17.0-alpha.0`.
- Updated the adapter to resolve a fresh D1 binding for each invocation.
- Fixed `dropAllTables` for circular foreign-key relationships.

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
