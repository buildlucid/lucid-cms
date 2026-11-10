# @lucidcms/cloudflare

## v0.20.0 (unreleased)

### Features:

- Plugins add Worker event handlers as modules with `cloudflare:worker-handler` artifacts.

### Breaking Changes:

- Renamed from `@lucidcms/runtime-cloudflare` to `@lucidcms/cloudflare`, and versions now match `@lucidcms/core`.
- Runs on Vite with `@cloudflare/vite-plugin` 2 and deploys with `cf deploy --prebuilt`, replacing Wrangler. Astro projects use `@astrojs/cloudflare` 15 with `withLucid` from `@lucidcms/cloudflare/config`.
- Removed the `d1` binding, the `wrangler` and `environment` options, and the KV and R2 preview options.
- Client addresses come only from `cf-connecting-ip`, no longer falling back to headers visitors can set.
