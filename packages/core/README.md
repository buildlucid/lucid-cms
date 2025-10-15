![Lucid CMS](https://github.com/buildlucid/lucid-cms/blob/master/banner.png?raw=true)

[![Tests](https://github.com/buildlucid/lucid-cms/actions/workflows/tests.yml/badge.svg)](https://github.com/buildlucid/lucid-cms/actions/workflows/tests.yml)
[![NPM Version](https://img.shields.io/npm/v/@lucidcms/core/latest.svg)](https://www.npmjs.com/package/@lucidcms/core)
![NPM Downloads](https://img.shields.io/npm/dw/@lucidcms/core)
![NPM License](https://img.shields.io/npm/l/@lucidcms/core)

<hr/>

> [!CAUTION]
> Lucid CMS is still in Alpha and under heavy development and hasnt implemented licensing yet and so cannot be used in a production setting. There is currently no commitment to backwards compatibility and breaking changes will be released on a regular basis while APIs and interfaces are being finalized.

<hr/>

A modern, TypeScript-first headless CMS designed for ultimate flexibility. Powered by sophisticated collection and brick builders, Lucid CMS gives you the freedom to craft content structures that match your exact needs. Whether you're deploying to traditional servers or the edge, connecting to your preferred database, or integrating through our extensive plugin ecosystem, Lucid CMS adapts to your workflow whilst delivering an exceptional experience for developers and content creators alike.

## ✨ Features

- 🚀 Deploy Anywhere:
    - Runtime Adapters: Deploy seamlessly to Node.js or Cloudflare Workers
    - Database Adapters: Full support for PostgreSQL, LibSQL, and SQLite
- 📝 Content Modeling:
    - Collection Builder: Create flexible collections for single or multiple documents
    - Brick Builder: Build reusable content blocks that can be mixed and matched across your collections
    - 15+ Custom Fields: Tailor your content with a wide range of field types
- 🎛️ Content Management:
    - Revisions & Drafts: Complete version history with rollback support
    - Media Library: Centralized asset management
    - Localization: Built-in multilingual content support
- 🔧 Built-in Capabilities:
    - Image Processing: On-demand resizing with next-gen formats and custom preset support
    - Email Integration: Flexible email strategies with customizable templates
    - User Management: Invite users and assign roles with granular permissions
- 🔌 Extensibility:
    - Plugin Ecosystem: Extend functionality with first-party and third-party plugins
    - Client Integrations: API access for fetching content in your websites and applications

## ⚙️ Runtime Adapters

- [Node](https://github.com/buildlucid/lucid-cms/tree/master/packages/node-adapter)
- [Cloudflare Workers](https://github.com/buildlucid/lucid-cms/tree/master/packages/cloudflare-adapter)

## 💾 DB Adapters

- [PostgreSQL](https://github.com/buildlucid/lucid-cms/tree/master/packages/postgres-adapter)
- [LibSQL](https://github.com/buildlucid/lucid-cms/tree/master/packages/libsql-adapter)
- [SQLite](https://github.com/buildlucid/lucid-cms/tree/master/packages/sqlite-adapter)

## 🛠️ First Party Plugins

- **[Pages](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-pages):** Adds nested document support to your collections along with slugs and computed fullSlugs based parent relationships.
- **[Nodemailer](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-nodemailer):** Extend the email strategy to support Nodemailer by passing down a custom transport.
- **[Resend](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-resend):** Extend the email strategy to use [Resend](https://resend.com/home).
- **[S3](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-s3):** Extend the media strategy to support using any S3 compatible storage solution.
- **Menus:** Coming soon!
- **Form Builder:** Coming soon!

## 🏁 Getting Started

To get started you can follow the [Getting Started](https://lucidcms.io/getting-started/) guide from our documentation. Lucid CMS is super easy to get up and running and with the SQLite DB adapter along with the [Local Storage](https://lucidcms.io/plugins/local-storage/) plugin, you can get set up without needing any third party services.

## 🖥️ Lucid UI

Still under development, Lucid UI is an Astro and TailwindCSS based UI library that is built to be used with Lucid CMS. It's not quite ready for prime time yet, but you can expect to see it launch down the line.
