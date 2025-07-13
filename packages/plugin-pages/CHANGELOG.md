# @lucidcms/plugin-pages

## 0.3.3

### Patch Changes

- Bumped core peer dependency version to `0.12.0-alpha.1`.

## 0.3.2

## Patch Changes

- Bumped core peer dependency version to `0.12.0-alpha.0`.
- Fixed error response format.

## 0.3.1

## Patch Changes

- Updated to use `WITH RECURSIVE` instead of `WITH` so that the plugin works with the PostgreSQL adapter as well.

## 0.3.0

### Minor Changes

- Updated to support new generate document tables and bumped core peer dependency version.

## 0.2.1

### Patch Changes

- Bumped core peer dependency version.

## 0.2.0

### Minor Changes

- Updated the plugin to work with the draft and published versions document db changes and new versionPromote hook.

## 0.1.3

### Patch Changes

- Added is_deleted check to the duplicate parent slug check to ensure we don't check against deleted documents.

## 0.1.2

### Patch Changes

- Updated Lucid imports to match new export structure and bumped core peer dependency version.

## 0.1.1

### Patch Changes

- Fixed bug where the current documents fullSlug was being added each level of recursion when generating it's descendant fullSlugs within the afterUpsert hook.

## 0.1.0

### Minor Changes

- Released the first version of the plugin.
