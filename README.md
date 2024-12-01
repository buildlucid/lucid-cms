![Lucid CMS](https://github.com/ProtoDigitalUK/lucid_cms/blob/master/banner.png?raw=true)

[![Tests](https://github.com/ProtoDigitalUK/lucid_cms/actions/workflows/tests.yml/badge.svg)](https://github.com/ProtoDigitalUK/lucid_cms/actions/workflows/tests.yml)
[![NPM Version](https://img.shields.io/npm/v/@lucidcms/core/latest.svg)](https://www.npmjs.com/package/@lucidcms/core)
![NPM Downloads](https://img.shields.io/npm/dw/@lucidcms/core)
![NPM License](https://img.shields.io/npm/l/@lucidcms/core)

<hr/>

> [!CAUTION]
> Lucid is still in Alpha and under heavy development, so please for the time being avoid using in any production setting. There is currently no commitment to backwards compatibility and breaking changes will be released on a regular basis while APIs and interfaces are being finalised.

<hr/>

A TypeScript-first, fully extensible headless CMS. Constructed using Fastify and SolidJS, it features sophisticated collection and brick builders, a wide range of plugins, and database adapters for PostgreSQL, LibSQL, and SQLite. It achieves the perfect balance of developer experience and an intuitive, easy-to-use interface for creators and end-users alike, without compromising on performance and flexibility.

Effortlessly configure Lucid to meet your content needs with our flexible configuration options, and an array of first-party plugins including LocalStorage, Resend, Nodemailer, S3, and more.

## ✨ Features

- 📝 Flexible Content Modelling:
    - Collection Builder: Create single or multiple document collections with customisable fields and translation support.
    - Brick Builder: Define reusable field groups for structured content creation.
    - 15+ Custom Fields: Tailor your content structure with a wide range of field types.
- 🎛️ Powerful Content Management:
    - Revisions & Drafts: Full content history with easy version restoration.
    - Media Library: Centralised management for images, videos, audio, and documents.
    - Localisation: Built-in support for multilingual content.
- 🛠️ Developer-Friendly:
    - TypeScript-First: Ensures type safety and improved developer experience.
    - Multiple Database Support: Choose from PostgreSQL, LibSQL, or SQLite.
    - Extensible Architecture: Plugins and hooks for custom feature development.
- 🔧 Capabilities:
    - Image Processing: On-demand resizing and reformatting, including next-gen formats (AVIF, WebP).
    - Email Integration: Customisable email strategies with template management.
    - User Management: Invite users and assign roles with granular permissions.
- 🔌 Integration & Scalability:
    - Client Integrations: Manage connections for headless front-ends.
    - API Toolkit: Programmatically interact with Lucid's services.
    - Plugin Ecosystem: Extend functionality with first-party and third-party plugins.

## 🛠️ First Party Plugins

- **[Pages](https://github.com/ProtoDigitalUK/lucid_cms/tree/master/packages/plugin-pages):** Adds nested document support to your collections along with slugs and computed fullSlugs based parent relationships.
- **[Nodemailer](https://github.com/ProtoDigitalUK/lucid_cms/tree/master/packages/plugin-nodemailer):** Extend the email strategy to support Nodemailer by passing down a custom transport.
- **[S3](https://github.com/ProtoDigitalUK/lucid_cms/tree/master/packages/plugin-s3):** Extend the media strategy to support using any S3 compatible storage solution.
- **[Local Storage](https://github.com/ProtoDigitalUK/lucid_cms/tree/master/packages/plugin-local-storage):** Extends the media strategy to support uploading media to your file system.
- **Menus:** Coming soon!
- **Resend:** Coming soon!
- **Form Builder:** Coming soon!

## 🏁 Getting Started

To get started you can follow the [Getting Started](https://lucidcms.io/getting-started/) guide from our documentation. Lucid is super easy to get up and running and with the SQLite DB adapter along with the [Local Storage](https://lucidcms.io/plugins/local-storage/) plugin, you can get set up without needing any third party services.

## 🖥️ Lucid UI

Still under development, Lucid UI is an Astro and TailwindCSS based UI library that is built to be used with Lucid. It's not quite ready for prime time yet, but you can expect to see it launch along side the Lucid beta in the coming months.