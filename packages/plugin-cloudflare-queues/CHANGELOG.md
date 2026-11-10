# @lucidcms/cloudflare-queues

## v0.20.0 (unreleased)

### Features:

- The binding and consumer now reach the Cloudflare runtime as a `cloudflare:bindings` artifact.
- Moved the queue consumer into a typed Worker handler module, which now applies `configure` and plugin data.

### Breaking Changes:

- Renamed from `@lucidcms/plugin-cloudflare-queues` to `@lucidcms/cloudflare-queues`, and versions now match `@lucidcms/core`.
- Development publishes to a local queue and consumes jobs with the Worker handler, as deployed, since Lucid's development server runs the Worker in workerd. Removed the inline development path.
