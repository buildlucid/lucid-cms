# @lucidcms/runtime-cloudflare

## v1.3.1 (unreleased)

- Stopped removing Wrangler and Miniflare process listeners outside their supported disposal lifecycles, preventing shared `signal-exit` state from becoming inconsistent.
- Split runtime media support checks into storage and delivery adapter capabilities.

## v1.3.0

- Adapter keys passed from `createLucidHost` response to `onListening` for telemetry support.
- Added generated Wrangler configuration support for the Cloudflare Images binding.
- Disposed the Wrangler platform proxy when Astro development and build lifecycles finish.
- Bumped `@lucidcms/core` to `0.18.0-alpha.0`.

## v1.2.0

- Bumped `@lucidcms/core` to `0.17.0-alpha.0`.
- Added Astro bridge support through the Astro Cloudflare adapter and its public Worker handler.
- Updated Worker requests, scheduled events and local development to use managed Lucid hosts with invocation-scoped database connections and clean shutdown.
- Added a tested default compatibility date to generated Wrangler configuration.
- Preserved Node request connection details when serving the Cloudflare runtime locally.

## v1.1.0

- Updated generated Worker config handling for the optional named environment schema export used by `@lucidcms/core`.
- Bumped `@lucidcms/core` to `0.16.0-alpha.0`.

## v1.0.2

- Bumped `@lucidcms/core` to `0.15.0-alpha.0`.

## v1.0.1

- Bumped `@lucidcms/core` to `0.14.0-alpha.0`.

## v1.0.0

- The initial release of the Cloudflare Worker runtime.
