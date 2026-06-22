# Lucid CMS - Cloudflare Runtime
> The official Cloudflare runtime for Lucid CMS

The Lucid CMS Cloudflare Workers runtime allows you to deploy your CMS to Cloudflare's edge computing platform. This is ideal for globally distributed applications that need low latency and high performance.

Using this runtime is by far the simplest way to deploy Lucid CMS.

## One-click Deploy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/buildlucid/lucid-cms/tree/master/templates/cloudflare-deploy)

Use the Cloudflare deploy template to deploy a Lucid CMS Worker with D1, KV, R2, and the Pages plugin.

## Installation

```bash
npm install @lucidcms/runtime-cloudflare
```

## Setup

Use the Cloudflare runtime in your `lucid.config.ts` file.

```typescript
import { configureLucid } from "@lucidcms/core";
import { cloudflare } from "@lucidcms/runtime-cloudflare";
import { libsql } from "@lucidcms/db-libsql";

export default configureLucid({
	runtime: cloudflare,
	db: libsql,
	config: () => ({
		// ...other config
	}),
});
```

### Configuration

The `cloudflare` function accepts a single parameter, `options`, which is either an optional object or a callback that receives Lucid's resolved env object.

| Property | Type | Description |
|----------|------|-------------|
| `environment` | `string` | Wrangler environment used when Lucid loads local Cloudflare bindings and env |
| `dev` | `{ port?: number; hostname?: string }` | Local Lucid dev server listen options |
| `wrangler` | `string` | Path to a user-owned Wrangler config. Omit this to let Lucid generate `wrangler.lucid.jsonc` |
| `bindings` | `object` | Explicit Cloudflare bindings to generate or override. Passing `true` for a binding uses Lucid's default binding name |
| `worker` | `{ name?: string; compatibilityDate?: string; compatibilityFlags?: string[]; crons?: string[] }` | Worker config that Lucid writes into the generated Wrangler config |

```typescript
export default configureLucid({
	runtime: cloudflare((env) => ({
		environment: "staging",
		dev: {
			port: Number(env.PORT ?? 6543),
		},
	})),
	db: libsql,
	config: () => ({
		// ...other config
	}),
});
```

## Wrangler Configuration

The Cloudflare runtime generates Wrangler config by default. During local prepare steps, Lucid writes:

```text
wrangler.lucid.jsonc
```

This file is generated, should be added to `.gitignore`, and is overwritten by Lucid when the Cloudflare runtime prepares. It lives at the project root so Wrangler, Astro's Cloudflare adapter, and other Cloudflare tools keep their normal root `.dev.vars` and `.env` lookup behavior.

During `lucidcms build`, Lucid writes a deploy-ready Wrangler config to your build output directory:

```text
dist/wrangler.jsonc
```

Lucid also writes Cloudflare's generated-config redirect:

```text
.wrangler/deploy/config.json
```

After building, you can deploy with:

```bash
wrangler deploy
```

For CLI commands that need to use remote Cloudflare resources, pass `--remote`:

```bash
lucidcms migrate --force --remote
```

The `--remote` flag tells the Cloudflare runtime to load remote bindings through Wrangler's platform proxy while that command runs.

If you already own a Wrangler config, pass its path to `wrangler`. Lucid will use that config for local Cloudflare env/binding loading and will not generate `wrangler.lucid.jsonc` or merge binding artifacts into your file:

```typescript
export default configureLucid({
	runtime: cloudflare({
		wrangler: "./wrangler.jsonc",
	}),
	db: libsql,
	config: () => ({
		// ...other config
	}),
});
```

Manual Wrangler mode means you own the bindings and deploy config. Lucid removes its old `wrangler.lucid.jsonc` only when the file is marked as Lucid-generated.

Cloudflare-aware Lucid packages can ask the runtime to generate their Wrangler bindings. For example, `db: d1`, `cloudflareKVPlugin()`, `cloudflareR2Plugin()`, and `cloudflareQueuesPlugin()` generate the matching D1, KV, R2, and Queue bindings with Lucid's convention names. Pass binding/resource details to the plugin or adapter that owns the feature:

```typescript
import { configureLucid } from "@lucidcms/core";
import { d1 } from "@lucidcms/db-d1";
import { cloudflareR2Plugin } from "@lucidcms/plugin-cloudflare-r2";
import { cloudflare } from "@lucidcms/runtime-cloudflare";

export default configureLucid({
	runtime: cloudflare,
	db: d1({ databaseName: "lucid-db" }),
	config: () => ({
		plugins: [
			cloudflareR2Plugin({
				bucketName: "lucid-media",
			}),
		],
	}),
});
```

Use `bindings` when you want the runtime to force or override generated binding details:

```typescript
export default configureLucid({
	runtime: cloudflare({
		bindings: {
			kv: true,
			r2: {
				binding: "MEDIA",
				bucketName: "lucid-media",
			},
		},
	}),
	db: libsql,
	config: () => ({
		// ...other config
	}),
});
```

## Media Storage

Due to the nature of Cloudflare Workers, they don't support file system operations. Because of this, you'll want to avoid the [LocalStorage](https://lucidjs.build/en/cms/docs/plugins/localstorage) plugin. For Cloudflare R2 bindings, we recommend the [Cloudflare R2](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-cloudflare-r2) plugin. For other object stores, the [S3](https://lucidjs.build/en/cms/docs/plugins/s3) plugin remains the generic option.

```typescript
import { configureLucid } from "@lucidcms/core";
import { libsql } from "@lucidcms/db-libsql";
import { cloudflareR2Plugin } from "@lucidcms/plugin-cloudflare-r2";
import { cloudflare } from "@lucidcms/runtime-cloudflare";

export default configureLucid({
	runtime: cloudflare,
	db: libsql,
	config: () => ({
		plugins: [
			cloudflareR2Plugin({
				bucketName: "lucid-media",
			}),
		],
	}),
});
```

## Media Streaming

By default, media is streamed via the `cdn` endpoint. This supports image processing via presets and fallback images. However, as Sharp isn't supported on Workers, image processing won't work. If you request an image via the CDN endpoint now and try to pass a preset, it will stream the original image instead of trying to optimize it via Sharp.

If you would like to still be able to process images on request, you can use the Cloudflare Images transforms feature like so:

```text
https://example.co.uk/cdn-cgi/image/width=800,quality=75,format=auto/${media_url}
```

## Sending Emails

For sending emails in Cloudflare Workers, the best first-party solution we have currently is to use our [Resend](https://lucidjs.build/en/cms/docs/plugins/resend) plugin. If you'd like to use a different email service, you'll need to implement your own email sending logic. You can find out more information on how to do this on the [Configuring Lucid CMS](https://lucidjs.build/en/cms/docs/configuration/configuring-lucid-cms) page.
