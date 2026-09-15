# @lucidcms/runtime-node

## v1.2.2 (unreleased)

- Added minutely job scheduling to production Astro builds running on Node.
- Updated imports to use the reorganised `@lucidcms/core` entry points.
- Added build support for discovered resources and plugin sources.
- Added live admin updates on the Node development server and support for programmatic SPA builds.

## v1.2.1

- Adapter keys passed from `createLucidHost` response to `onListening` for telemetry support.
- Bumped `@lucidcms/core` to `0.18.0-alpha.0`.

## v1.2.0

- Bumped `@lucidcms/core` to `0.17.0-alpha.0`.
- Added Astro bridge support for hosting Lucid through the Astro Node adapter.
- Updated Node and Astro requests, cron jobs and generated servers to use managed Lucid hosts with invocation-scoped database connections and clean shutdown.
- Preserved request connection details when handling Node requests.

## v1.1.0

- Updated compiled server config generation for the optional named environment schema export used by `@lucidcms/core`.
- Bumped `@lucidcms/core` to `0.16.0-alpha.0`.

## v1.0.2

- Bumped `@lucidcms/core` to `0.15.0-alpha.0`.

## v1.0.1

- Bumped `@lucidcms/core` to `0.14.0-alpha.0`.

## v1.0.0

- The initial release of the Node.js runtime.
