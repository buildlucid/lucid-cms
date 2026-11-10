# @lucidcms/astro

## v0.20.0 (unreleased)

### Features:

- Passes Astro's `clientAddress` to Lucid for rate limits and login records.

### Breaking Changes:

- Versions now match `@lucidcms/core`.
- Rebuilt on `lucid()` from `@lucidcms/core/vite`, so Lucid runs in Astro's server environment, including workerd on Cloudflare, and projects no longer get generated files in `.lucid/astro`.
- Runtime bridges return Vite settings from `vite`, replacing `prepare` and `teardown`.
