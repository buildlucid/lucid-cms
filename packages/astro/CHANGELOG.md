# @lucidcms/astro

## v0.3.0 (unreleased)

- Reworked the Astro integration around runtime-provided bridges, lifecycle-aware hosts and config dependency reloads.
- Added server and static output support with on-demand Lucid routes and a generated server toolkit.
- Fixed generated files causing overlapping Vite restarts during config reloads.

## v0.2.0

- Added support for the optional named environment schema export from `@lucidcms/core` when generating Astro runtime modules.
- Dropped custom dev toolbar entry and Lucid toolbar.
- Bumped `@lucidcms/core` to `0.16.0-alpha.0`.

## v0.1.2

- Bumped `@lucidcms/core` to `0.15.0-alpha.0`.

## v0.1.1

- Fixed configureLucid resolution issue when in workspaces based on where packages are installed.
- Bumped `@lucidcms/core` to `0.14.0-alpha.0`.

## v0.1.0

- Initial beta release of the Astro Lucid integration.
