# @lucidcms/db-libsql

## 1.0.2

- Bumped `@lucidcms/core` to `0.15.0-alpha.0`.

## 1.0.1

- Fixed `dropAllTables` so it disables foreign key constraints before dropping tables. Allows us to drop tables even when tables contain circular references.
- Bumped `@lucidcms/core` to `0.14.0-alpha.0`.

## 1.0.0

- The initial release of the LibSQL database adapter for Lucid CMS.
