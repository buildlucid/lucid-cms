# @lucidcms/db-sqlite

## 1.0.1 (unreleased)

- Fixed `dropAllTables` so it disables foreign key constraints before dropping tables. Allows us to drop tables even when tables contain circular references.

## 1.0.0

- The initial release of the SQLite database adapter for Lucid CMS.
