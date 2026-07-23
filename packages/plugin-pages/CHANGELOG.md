# @lucidcms/plugin-pages

## 0.6.0 (unreleased)

- Replaced `collectionKey` with `collection` in collection options.
- Moved full slug visibility to `ui.fullSlug`.
- Added `ui.tab` for placing plugin fields in an existing named collection tab.
- Added `ui.widths` for overriding individual plugin field widths.
- Added responsive field width defaults, including a 50/50 `fullSlug` and `slug` row when the full slug is visible.

## 0.5.1

- Bumped `@lucidcms/core` to `0.16.0-alpha.0`.

## 0.5.0

- Bumped `@lucidcms/core` to `0.15.0-alpha.0`.
- Added computed `fullSlug` route uniqueness checks.
- Added `unique.fields` to include selected top-level field values in uniqueness checks.
- Fixed route collision checks for localized parent relations, root-parent routes, and descendant `fullSlug` updates.
- Fixed descendant `fullSlug` updates after deleting a parent with collection prefixes configured.

## 0.4.1

- Bumped `@lucidcms/core` to `0.14.0-alpha.0`.

## 0.4.0

- Bumped core peer dependency version to `0.13.0-alpha.0`.
- Added multi-tenants support.
- Added translations support.

## 0.3.3

- Bumped core peer dependency version to `0.12.0-alpha.1`.

## 0.3.2

- Bumped core peer dependency version to `0.12.0-alpha.0`.
- Fixed error response format.

## 0.3.1

- Updated to use `WITH RECURSIVE` instead of `WITH` so that the plugin works with the PostgreSQL adapter as well.

## 0.3.0

- Updated to support new generate document tables and bumped core peer dependency version.

## 0.2.1

- Bumped core peer dependency version.

## 0.2.0

- Updated the plugin to work with the draft and published versions document db changes and new versionPromote hook.

## 0.1.3

- Added is_deleted check to the duplicate parent slug check to ensure we don't check against deleted documents.

## 0.1.2

- Updated Lucid imports to match new export structure and bumped core peer dependency version.

## 0.1.1

- Fixed bug where the current documents fullSlug was being added each level of recursion when generating it's descendant fullSlugs within the afterUpsert hook.

## 0.1.0

- Released the first version of the plugin.
