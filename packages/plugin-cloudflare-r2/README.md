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
import { cloudflare } from "@lucidcms/runtime-cloudflare";
import { libsql } from "@lucidcms/db-libsql";
import { cloudflareR2Plugin } from "@lucidcms/plugin-cloudflare-r2";

export const env = z.object({
	LIBSQL_URL: z.string(),
	LIBSQL_AUTH_TOKEN: z.string().optional(),
	MEDIA_BUCKET: z.any(),
});

export default configureLucid({
	runtime: cloudflare,
	db: libsql,
	config: (env) => ({
		plugins: [
			cloudflareR2Plugin({
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

## Bucket Configuration

When using the optional HTTP fallback, direct browser uploads need an R2 CORS policy that allows `PUT` requests and the upload metadata headers. Expose the `ETag` response header if possible so the admin UI can complete multipart uploads without an extra server-side reconciliation request.
