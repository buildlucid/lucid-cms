# @lucidcms/plugin-worker-queues

## v1.0.4 (unreleased)

- Flushed pending logger transport work before worker queue consumers exit and added structured queue error details.

## v1.0.3

- Prevented queued emails from repeating email adapter readiness checks that only need to run when the runtime starts.
- Bumped `@lucidcms/core` to `0.16.0-alpha.0`.

## v1.0.2

- Bumped `@lucidcms/core` to `0.15.0-alpha.0`.

## v1.0.1

- Bumped `@lucidcms/core` to `0.14.0-alpha.0`.

## v1.0.0

- Initial release of the worker queues plugin.
