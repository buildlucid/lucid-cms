# @lucidcms/db-postgres

## v1.3.0 (unreleased)

- Updated JSON handling to use Lucid's managed query layer, avoiding adapter-wide parsing of values that only look like JSON.

## v1.2.0

- Bumped `@lucidcms/core` to `0.17.0-alpha.0`.
- Updated the adapter to create explicit PostgreSQL connections through `connect()` and resolve environment options for each connection.

## v1.1.1

- Fixed PostgreSQL migrations for datetime fields without defaults.

## v1.1.0

- Set `caseInsensitiveLikeOperator` configuration for core.
- Dropped support for `pg_trgm`.
- Added `real` data type support using `double precision`.
- Bumped `@lucidcms/core` to `0.16.0-alpha.0`.

## v1.0.2

- Bumped `@lucidcms/core` to `0.15.0-alpha.0`.

## v1.0.1

- Bumped `@lucidcms/core` to `0.14.0-alpha.0`.

## v1.0.0

- The initial release of the PostgreSQL database adapter for Lucid CMS.
