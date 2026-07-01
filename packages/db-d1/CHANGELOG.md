# @lucidcms/db-d1

## 0.1.1 (unreleased)

- Fixed `dropAllTables` so it disables foreign key constraints before dropping tables. Allows us to drop tables even when tables contain circular references.

## 0.1.0

- Initial beta release of the Cloudflare D1 database adapter.
