# @lucidcms/sqlite-kv

## v0.20.0 (unreleased)

### Breaking Changes:

- Renamed from `@lucidcms/plugin-sqlite-kv` to `@lucidcms/sqlite-kv`, and versions now match `@lucidcms/core`.

### Bug Fixes:

- Fixed counters, such as rate limits, failing with "database is locked" when several processes share the KV file.
