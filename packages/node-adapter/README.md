# Lucid CMS - Node Adapter 

> The official Node adapter for Lucid CMS

The Lucid CMS Node adapter allows you to run your CMS on any Node.js environment. This is ideal for traditional server deployments, VPS hosting, and development environments where you have full control over the runtime.

Using this adapter is the most flexible way to run Lucid CMS. Out of the box, it supports the most features without additional configuration, and it can be extended with any of the current plugins.

## Installation

```bash
npm install @lucidcms/node-adapter
```

## Setup

To use the Node adapter, you must export the adapter from your `lucid.config.ts` file as well as default exporting the config with the `defineConfig` function.

```typescript
import { nodeAdapter, defineConfig } from "@lucidcms/node-adapter";

export const adapter = nodeAdapter();

export default defineConfig((env) => ({
    // ...other config
}));
```

### Configuration

The `nodeAdapter` function accepts a single parameter, `options`, which is an optional object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `server` | `{ port?: number; hostname?: string }` | The server options. The `lucidcms dev` and `lucidcms serve` scripts use these when serving the Node server |

## Media Storage

When using the Node adapter, you have several options for media storage:

- **[Local Storage](https://lucidjs.build/en/cms/docs/plugins/localstorage)** - Store files directly on your server's file system (ideal for development or single-server deployments)
- **[S3](https://lucidjs.build/en/cms/docs/plugins/s3)** - Use AWS S3, Cloudflare R2, or any S3-compatible storage service

## Sending Emails

For sending emails with the Node adapter, you can use either:

- **[Nodemailer](https://lucidjs.build/en/cms/docs/plugins/nodemailer)** - Use any SMTP server or email service provider
- **[Resend](https://lucidjs.build/en/cms/docs/plugins/resend)** - Use Resend's API for simple email s