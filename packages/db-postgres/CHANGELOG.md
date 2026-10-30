# @lucidcms/db-postgres

## v1.2.3 (unreleased)

- Database schema checks now correctly recognise foreign keys that use multiple columns.
- Fixed `NOW()` defaults on collection `timestamptz` columns being stored as a fixed date, which made every migration report changed defaults.
- Fixed JSON values being encoded twice, so `jsonb` columns held strings instead of objects and arrays.
- Updated `postgres` to v4 and `kysely-postgres-js` to v5. Queries now use named prepared statements, so connection poolers in transaction mode need `prepare: false`, and migrations need a direct connection.

## v1.2.2

- Updated imports to use the reorganised `@lucidcms/core` entry points.
- Bumped `@lucidcms/core` to `0.19.0-alpha.0`.

## v1.2.1

- Updated JSON handling to use Lucid's managed query layer, avoiding adapter-wide parsing of values that only look like JSON.
- Bumped `@lucidcms/core` to `0.18.0-alpha.0`.

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
