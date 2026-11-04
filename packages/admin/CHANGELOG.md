# @lucidcms/admin

## v0.20.0-alpha.0 (unreleased)

- Added `createAdminVite` to `@lucidcms/admin/build`, which embeds the admin in a host's Vite app, and `buildAdmin` now builds with it. Removed `createAdminDevServer` and the build cache.
- Added the `captcha.widget` slot for captcha plugins' widgets on public forms.
- Added the `maintenance.action` slot and `MaintenanceTile` component for plugin maintenance actions on System → Operations.
- Added a `Skeleton` component, which replaces `LoadingState`, and loading buttons now pulse instead of showing a spinner.
- Added `StateNote` and `CardState` components and an `appearance` option on `QueryBoundary` for empty and error states inside cards.
- Added `InfoRow.Item` for cards of divided rows, plus `aside` and `padding` options on `InfoRow`.
- Added `@lucidcms/admin/toolbar`, the `<lucid-toolbar>` that used to come from `@lucidcms/client/toolbar`.
- The admin now serves the builder's preview script at `/admin/preview.js`, and draws the preview's edit controls itself.
- Added an `action` option to `toast`.

## v0.19.0-alpha.0

- Added admin extensions for custom routes, slots, scripts and stylesheets, with public components, hooks and services.
- Bumped `@lucidcms/rich-text` to `1.2.0`.
- Bumped `@lucidcms/types` to `0.6.0`.
