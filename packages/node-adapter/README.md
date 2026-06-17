# Lucid CMS - Node Adapter 

> The official Node adapter for Lucid CMS

The Lucid CMS Node adapter allows you to run your CMS on any Node.js environment. This is ideal for traditional server deployments, VPS hosting, and development environments where you have full control over the runtime.

Using this adapter is the most flexible way to run Lucid CMS. Out of the box, it supports the most features without additional configuration, and it can be extended with any of the current plugins.

## Installation

```bash
npm install @lucidcms/node-adapter
```

## Setup

Use the Node runtime in your `lucid.config.ts` file.

```typescript
import { configureLucid } from "@lucidcms/core";
import { node } from "@lucidcms/node-adapter";
import { sqlite } from "@lucidcms/sqlite-adapter";

export default configureLucid({
	runtime: node,
	db: sqlite,
	config: () => ({
		// ...other config
	}),
});
```

### Configuration

The `node` function accepts a single parameter, `options`, which is either an optional object or a callback that receives Lucid's resolved env object.

| Property | Type | Description |
|----------|------|-------------|
| `server` | `{ port?: number; hostname?: string }` | The server options. The `lucidcms dev` and `lucidcms serve` scripts use these when serving the Node server |

```typescript
export default configureLucid({
	runtime: node((env) => ({
		server: {
			port: Number(env.PORT ?? 6543),
		},
	})),
	db: sqlite,
	config: () => ({
		// ...other config
	}),
});
```

## Media Storage

When using the Node adapter, you have several options for media storage:

- **[Filesystem](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-filesystem)** - Store files directly on your server's file system (ideal for development or single-server deployments)
- **[S3](https://lucidjs.build/en/cms/docs/plugins/s3)** - Use AWS S3, Cloudflare R2, or any S3-compatible storage service

## Sending Emails

For sending emails with the Node adapter, you can use either:

- **[Nodemailer](https://lucidjs.build/en/cms/docs/plugins/nodemailer)** - Use any SMTP server or email service provider
- **[Resend](https://lucidjs.build/en/cms/docs/plugins/resend)** - Use Resend's API for simple emails
