# Lucid CMS - Cloudflare Runtime
> The official Cloudflare runtime for Lucid CMS

The Lucid CMS Cloudflare Workers runtime allows you to deploy your CMS to Cloudflare's edge computing platform. This is ideal for globally distributed applications that need low latency and high performance.

Using this runtime is by far the simplest way to deploy Lucid CMS.

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
| `platformProxy` | `GetPlatformProxyOptions` | A Wrangler platform proxy options object |
| `server` | `{ port?: number; hostname?: string }` | The server options. The `lucidcms dev` script uses these when serving the local Node server |
| `wrangler` | `{ generate?: boolean; bindings?: object; configPath?: string; name?: string; compatibilityDate?: string; compatibilityFlags?: string[]; crons?: string[] }` | Controls generated Wrangler config output. Generation is enabled by default. Bindings are opt-in and support Lucid defaults with `true` |

```typescript
export default configureLucid({
	runtime: cloudflare((env) => ({
		server: {
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

The Cloudflare runtime generates a deploy-ready Wrangler config by default during `lucidcms build`.

For local CLI commands that need Cloudflare bindings, Lucid writes a temporary Wrangler config to:

```text
.lucid/wrangler.jsonc
```

The generated config is written to your build output directory:

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

If you already have a `wrangler.jsonc`, `wrangler.json`, or `wrangler.toml`, Lucid treats it as source config and merges it into the generated output. Lucid owns the required Worker entry, assets binding, Node compatibility flag, and default cron triggers in the generated config.

Bindings are generated only when explicitly enabled. Passing `true` uses Lucid's convention names: `LUCID_KV`, `LUCID_MEDIA_BUCKET`, and `LUCID_QUEUE`. If you use a custom binding name, pass the same custom name to the matching Cloudflare plugin.

To disable generation and fully own your Wrangler config, pass:

```typescript
export default configureLucid({
	runtime: cloudflare({
		wrangler: {
			generate: false,
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
import { cloudflare } from "@lucidcms/runtime-cloudflare";
import { libsql } from "@lucidcms/db-libsql";
import CloudflareR2 from "@lucidcms/plugin-cloudflare-r2";

export default configureLucid({
	runtime: cloudflare({
		wrangler: {
			bindings: {
				r2: {
					bucketName: "lucid-media",
				},
			},
		},
	}),
	db: libsql,
	config: () => ({
		plugins: [
			CloudflareR2(),
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
