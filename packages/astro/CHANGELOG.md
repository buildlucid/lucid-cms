# @lucidcms/astro

## v0.3.3 (unreleased)

- Rebuilt on `lucid()` from `@lucidcms/core/vite`, so Lucid runs in Astro's server environment, including workerd on Cloudflare, and projects no longer get generated files in `.lucid/astro`.
- Runtime bridges return Vite settings from `vite`, replacing `prepare` and `teardown`.

## v0.3.2

- Fixed Astro dev servers hanging after `Ctrl+C` with Cloudflare runtimes by explicitly awaiting Lucid and Vite teardown for `SIGINT` and `SIGTERM`.
- Updated imports to use the reorganised `@lucidcms/core` entry points.
- Updated the generated toolkit to use toolkit types from `@lucidcms/core/types`.
- Added support for discovered resources and plugin sources in dev and builds.
- Added live admin updates during development and programmatic SPA builds during `astro build`, with separate Vite settings for the admin.
- Stopped Astro's waiting message from interrupting migration prompts.
- Bumped `@lucidcms/core` to `0.19.0-alpha.0`.

## v0.3.1

- Added runtime-specific teardown handling for Astro dev servers and builds.
- Bumped `@lucidcms/core` to `0.18.0-alpha.0`.

## v0.3.0

- Bumped `@lucidcms/core` to `0.17.0-alpha.0`.
- Reworked the Astro integration to use runtime bridges and a shared Lucid host, with request-scoped database connections and config reloads.
- Added server and static output support with on-demand Lucid routes and a generated server toolkit.
- Changed `getToolkit` to require the current Astro context.

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
