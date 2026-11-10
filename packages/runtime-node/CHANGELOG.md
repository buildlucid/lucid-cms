# @lucidcms/node

## v0.20.0 (unreleased)

### Breaking Changes:

- Renamed from `@lucidcms/runtime-node` to `@lucidcms/node`, and versions now match `@lucidcms/core`.
- Runs on Vite through `@lucidcms/core/vite`, with builds writing a Node server whose packages load from `node_modules`. Removed the `./runtime` export.
- Hosted Lucid, such as in Astro, uses the client address its host passes instead of trusting `X-Forwarded-For`.

### Bug Fixes:

- Fixed scheduled jobs ignoring `url`.
