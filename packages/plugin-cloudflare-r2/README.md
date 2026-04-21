# Lucid CMS - Cloudflare R2 Plugin

> The official Cloudflare R2 plugin for Lucid

This plugin registers the Lucid media adapter using a Cloudflare R2 binding. It can optionally fall back to S3-compatible HTTP signing when you want direct browser uploads instead of proxying uploads through the Worker.

## Installation

```bash
npm install @lucidcms/plugin-cloudflare-r2
```

## Setup

```ts
import { configureLucid, z } from "@lucidcms/core";
import CloudflareR2Plugin from "@lucidcms/plugin-cloudflare-r2";

export const env = z.object({
	MEDIA_BUCKET: z.any(),
});

export default configureLucid({
	adapter: {
		module: "@lucidcms/cloudflare-adapter",
	},
	config: (env) => ({
		plugins: [
			CloudflareR2Plugin({
				binding: env.MEDIA_BUCKET,
			}),
		],
	}),
});
```

## Configuration

| Property | Type | Description |
|----------|------|-------------|
| `binding` | `R2Bucket` | The Cloudflare R2 binding to use |
| `http` | `object` | Optional S3-compatible HTTP fallback for direct browser uploads/downloads |
| `upload` | `object` | Optional default R2 HTTP metadata, custom metadata, and storage class |
