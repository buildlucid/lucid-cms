# @lucidcms/runtime-cloudflare

## v1.2.0 (unreleased)

- Added Astro bridge support through the Astro Cloudflare adapter and its public Worker handler.
- Stabilized generated Wrangler configuration with a tested default compatibility date.
- Ensured development server shutdown awaits Lucid application and platform cleanup so logger transports can flush.

## v1.1.0

- Updated generated Worker config handling for the optional named environment schema export used by `@lucidcms/core`.
- Bumped `@lucidcms/core` to `0.16.0-alpha.0`.

## v1.0.2

- Bumped `@lucidcms/core` to `0.15.0-alpha.0`.

## v1.0.1

- Bumped `@lucidcms/core` to `0.14.0-alpha.0`.

## v1.0.0

- The initial release of the Cloudflare Worker runtime.
