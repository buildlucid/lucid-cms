# @lucidcms/postgres

## v0.20.0 (unreleased)

### Breaking Changes:

- Renamed from `@lucidcms/db-postgres` to `@lucidcms/postgres`, and versions now match `@lucidcms/core`.
- Updated `postgres` to v4 and `kysely-postgres-js` to v5. Queries now use named prepared statements, so connection poolers in transaction mode need `prepare: false`, and migrations need a direct connection.

### Bug Fixes:

- Database schema checks now correctly recognise foreign keys that use multiple columns.
- Fixed `NOW()` defaults on collection `timestamptz` columns being stored as a fixed date, which made every migration report changed defaults.
- Fixed JSON values being encoded twice, so `jsonb` columns held strings instead of objects and arrays.
