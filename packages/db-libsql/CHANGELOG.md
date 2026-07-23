# @lucidcms/db-libsql

## v1.1.1 (unreleased)

- Fixed `dropAllTables` for remote databases with circular foreign-key relationships.

## v1.1.0

- Set `caseInsensitiveLikeOperator` configuration for core.
- Added `real` data type support.
- Bumped `@lucidcms/core` to `0.16.0-alpha.0`.

## v1.0.2

- Bumped `@lucidcms/core` to `0.15.0-alpha.0`.

## v1.0.1

- Fixed `dropAllTables` so it disables foreign key constraints before dropping tables. Allows us to drop tables even when tables contain circular references.
- Bumped `@lucidcms/core` to `0.14.0-alpha.0`.

## v1.0.0

- The initial release of the LibSQL database adapter for Lucid CMS.
