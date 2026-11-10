# @lucidcms/cloudflare-kv

## v0.20.0 (unreleased)

### Features:

- The binding now reaches the Cloudflare runtime as a `cloudflare:bindings` artifact.

### Breaking Changes:

- Renamed from `@lucidcms/plugin-cloudflare-kv` to `@lucidcms/cloudflare-kv`, and versions now match `@lucidcms/core`.
- Removed the `previewId` option, which Cloudflare's `cf` CLI has no equivalent for.
