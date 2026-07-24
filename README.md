![Lucid CMS](https://github.com/buildlucid/lucid-cms/blob/master/banner.png?raw=true)

[![Tests](https://github.com/buildlucid/lucid-cms/actions/workflows/tests.yml/badge.svg)](https://github.com/buildlucid/lucid-cms/actions/workflows/tests.yml)
[![NPM Version](https://img.shields.io/npm/v/@lucidcms/core/latest.svg)](https://www.npmjs.com/package/@lucidcms/core)
![NPM Downloads](https://img.shields.io/npm/dw/@lucidcms/core)
[![License](https://img.shields.io/badge/license-BSL%201.1%20%2F%20MIT-blue)](./LICENSE.md)

---

> [!CAUTION]
> Lucid CMS is currently in alpha. The core is licensed under BSL 1.1, with free use for non-commercial projects, education, and non-profits. Commercial licensing and AI access will launch alongside the beta release. Until then, expect breaking changes while APIs and product surfaces are finalized.

---

Lucid CMS is a TypeScript-first headless CMS for teams that need flexible content modeling, polished editorial workflows, and control over where their content platform runs.

Developers get a code-first collection system, typed APIs for consuming content, runtime and database adapters, and plugin support for shaping Lucid around real project needs. For content teams, Lucid provides a modern editing experience with media management, release review, scheduled publishing, localization, and AI content tools.

## ✨ Features

- **Model content your way:** code-defined collections, reusable bricks, custom fields and localization.
- **Manage publishing with confidence:** environments, revisions, workflow stages, release review, approvals, and scheduled publishing.
- **Organize teams and sites:** tenants, roles, granular permissions, and client integrations.
- **Handle media and email properly:** folders, private media, shareable links, image processing, cropping, email logs, previews, and redaction policies.
- **Extend it for your project:** plugins, service hooks, toolkit, and custom routes let you add content behavior, integrations, and side effects.
- **Choose your infrastructure:** Node.js or Cloudflare Workers, PostgreSQL, LibSQL, SQLite, D1, queues, KV, email, storage.
- **Use AI where it helps:** generate and edit images, generate alt text, create custom field values, and track AI usage.

AI features require a subscription with Lucid. This is planned to become publicly available with the beta release.

## ⚙️ Runtime Adapters

- [Node.js](https://github.com/buildlucid/lucid-cms/tree/master/packages/runtime-node) for traditional servers, VPS deployments, local development, and full Node runtime access.
- [Cloudflare Workers](https://github.com/buildlucid/lucid-cms/tree/master/packages/runtime-cloudflare) for edge deployments with generated Wrangler configuration, bindings, scheduled handlers, and queue handlers.

## 💾 Database Adapters

- [PostgreSQL](https://github.com/buildlucid/lucid-cms/tree/master/packages/db-postgres)
- [LibSQL](https://github.com/buildlucid/lucid-cms/tree/master/packages/db-libsql)
- [SQLite](https://github.com/buildlucid/lucid-cms/tree/master/packages/db-sqlite)
- [Cloudflare D1](https://github.com/buildlucid/lucid-cms/tree/master/packages/db-d1) (beta)

## 🔌 First-Party Plugins

- [Pages](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-pages): adds hierarchical documents, slugs, parent pages, and computed full slugs for website page collections.
- [Filesystem](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-filesystem): stores uploaded media on the local filesystem.
- [S3](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-s3): stores media in AWS S3, Cloudflare R2, or another S3-compatible provider.
- [Cloudflare R2](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-cloudflare-r2): uses a Cloudflare R2 binding with optional S3-compatible HTTP fallback.
- [Sharp](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-sharp): uses Sharp for Lucid's on-demand image processing.
- [Nodemailer](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-nodemailer): sends email through a custom Nodemailer transport.
- [Resend](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-resend): sends email through Resend and supports Resend webhooks for delivery tracking.
- [GitHub Auth](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-github-auth): adds GitHub as an authentication provider.
- [Google Auth](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-google-auth): adds Google as an authentication provider.
- [Microsoft Auth](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-microsoft-auth): adds Microsoft as an authentication provider.
- [Worker Queues](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-worker-queues): registers a Node worker-thread queue adapter for background jobs and scheduled work.
- [Cloudflare Queues](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-cloudflare-queues): registers a Cloudflare Queues adapter.
- [SQLite KV](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-sqlite-kv): registers a local SQLite-backed KV adapter.
- [Redis](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-redis): registers a Redis-backed KV adapter.
- [Cloudflare KV](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-cloudflare-kv): registers a Cloudflare KV adapter.

## 🧩 Framework And Client Packages

- [Astro](https://github.com/buildlucid/lucid-cms/tree/master/packages/astro): the official integration for running Lucid alongside Astro.
- [Client](https://github.com/buildlucid/lucid-cms/tree/master/packages/client): typed client for public document, media, and locale endpoints.
- [Rich Text](https://github.com/buildlucid/lucid-cms/tree/master/packages/rich-text): shared Tiptap extensions and rich text conversion utilities.

## 🏁 Getting Started

Follow the [installation guide](https://lucidcms.io/en/cms/docs/getting-started/installation/) for the full setup flow.

For a local Node.js project, the smallest useful setup is typically:

```bash
npm install @lucidcms/core @lucidcms/runtime-node @lucidcms/db-sqlite @lucidcms/plugin-filesystem
```

Then create a `lucid.config.ts` file with a runtime, database adapter, secrets, media settings, and collections. SQLite plus the filesystem plugin is the fastest way to explore Lucid locally without external infrastructure.

Or deploy our Cloudflare template by clicking the button below.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/buildlucid/lucid-cms/tree/master/templates/cloudflare-deploy)

For a Node.js and PostgreSQL deployment, use the
[Railway starter](https://github.com/buildlucid/lucid-cms/tree/master/templates/railway-deploy).

## 📄 Licensing

Lucid CMS uses a mixed-license model:

- The core CMS is licensed under BSL 1.1.
- Each version promotes to MIT after 4 years.
- Runtime adapters, database adapters, plugins, the client, shared types, and rich text utilities are MIT licensed.
- Free use is intended for non-commercial projects, education, and non-profits.
- Commercial use will require a license purchased through the Lucid website once beta launches.

See [LICENSE.md](./LICENSE.md) for the repository licensing summary.
