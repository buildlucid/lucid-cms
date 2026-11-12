# @lucidcms/worker-queues

## v0.20.0 (unreleased)

### Breaking Changes:

- Renamed from `@lucidcms/plugin-worker-queues` to `@lucidcms/worker-queues`, and versions now match `@lucidcms/core`.

### Bug Fixes:

- Fixed one slow job stopping the worker from starting any other job until it finished, even with slots free.
- Fixed delayed jobs and retries running up to 30 seconds late on a quiet worker.
