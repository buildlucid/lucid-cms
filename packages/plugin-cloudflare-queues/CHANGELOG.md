# @lucidcms/plugin-cloudflare-queues

## v1.1.0 (unreleased)

- Updated queue consumers to use the background Lucid host and one database connection for each batch.
- Added structured event and error details to queue failure logs.

## v1.0.3

- Prevented queued emails from repeating email adapter readiness checks that only need to run when the runtime starts.
- Bumped `@lucidcms/core` to `0.16.0-alpha.0`.

## v1.0.2

- Bumped `@lucidcms/core` to `0.15.0-alpha.0`.

## v1.0.1

- Bumped `@lucidcms/core` to `0.14.0-alpha.0`.

## v1.0.0

- The initial release of the Cloudflare Queues plugin for Lucid CMS.
