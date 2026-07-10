# @lucidcms/db-d1

## 0.1.3 (unreleased)

- Set `caseInsensitiveLikeOperator` configuration for core.

## 0.1.2

- Bumped `@lucidcms/core` to `0.15.0-alpha.0`.

## 0.1.1

- Fixed `dropAllTables` so it disables foreign key constraints before dropping tables. Allows us to drop tables even when tables contain circular references.
- Bumped `@lucidcms/core` to `0.14.0-alpha.0`.

## 0.1.0

- Initial beta release of the Cloudflare D1 database adapter.
