# Lucid CMS - Cloudflare Worker Adapter 

> The official Cloudflare Worker adapter for Lucid CMS

The Lucid CMS Cloudflare Workers adapter allows you to deploy your CMS to Cloudflare's edge computing platform. This is ideal for globally distributed applications that need low latency and high performance.

Using this adapter is by far the simplest way to deploy Lucid CMS.

## Installation

```bash
npm install @lucidcms/cloudflare-adapter
```

## Setup

To use the Cloudflare adapter, you must export the adapter from your `lucid.config.ts` file as well as default exporting the config with the `defineConfig` function.

```typescript
import { cloudflareAdapter, defineConfig } from "@lucidcms/cloudflare-adapter";

export const adapter = cloudflareAdapter();

export default defineConfig((env) => ({
    // ...other config
}));
```

### Configuration

The `cloudflareAdapter` function accepts a single parameter, `options`, which is an optional object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `platformProxy` | `GetPlatformProxyOptions` | A Wrangler platform proxy options object |
| `server` | `{ port?: number; hostname?: string }` | The server options. The `lucidcms dev` script uses these when serving the local Node server |

## Wrangler Configuration

You'll need to configure Wrangler to deploy your Cloudflare Worker. Create a `wrangler.toml` file in your project root:

```toml
name = "lucid-cms"
main = "dist/server.js"
compatibility_date = "2025-06-12"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "./dist/public/"
binding = "ASSETS"

[[triggers.crons]]
cron = "0 0 * * *"

[build]
watch_dir = "./src"
command = "lucidcms build --cache-spa --silent"
cwd = "./"
```

## Media Storage

Due to the nature of Cloudflare Workers, they don't support file system operations. Because of this, you'll want to avoid the [LocalStorage](https://lucidjs.build/en/cms/docs/plugins/localstorage) plugin. Instead, we recommend using the [S3](https://lucidjs.build/en/cms/docs/plugins/s3) plugin along with Cloudflare R2 or other S3-compatible storage.

```typescript
import { cloudflareAdapter, defineConfig } from "@lucidcms/cloudflare-adapter";
import LucidS3 from "@lucidcms/plugin-s3";

export const adapter = cloudflareAdapter();

export default defineConfig((env) => ({
    plugins: [
        LucidS3({
            endpoint: env.S3_ENDPOINT,
            bucket: env.S3_BUCKET,
            clientOptions: {
                region: "auto",
                accessKeyId: env.S3_ACCESS_KEY_ID,
                secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            },
        }),
    ],
    // ...other config
}));
```

## Media Streaming

By default, media is streamed via the `cdn` endpoint. This supports image processing via presets and fallback images. However, as Sharp isn't supported on Workers, image processing won't work. To fix this, you'll need to explicitly tell Lucid CMS to bypass the image processor:

```typescript
import { cloudflareAdapter, defineConfig } from "@lucidcms/cloudflare-adapter";
import { passthroughImageProcessor } from "@lucidcms/core";

export const adapter = cloudflareAdapter();

export default defineConfig((env) => ({
    media: {
        imageProcessor: passthroughImageProcessor,
    },
    // ...other config
}));
```

If you request an image via the CDN endpoint now and try to pass a preset, it will stream the original image instead of trying to optimize it via Sharp.

## Image Processing with Cloudflare Images

If you want to support image processing and don't want to handle this at build time, you can configure Cloudflare Images. To do this, you'll need to configure the URL strategy along with configuring your R2 bucket to have a custom domain and enabling Cloudflare Images for that domain.

```typescript
import { cloudflareAdapter, defineConfig } from "@lucidcms/cloudflare-adapter";
import { passthroughImageProcessor } from "@lucidcms/core";

export const adapter = cloudflareAdapter();

export default defineConfig((env) => ({
    media: {
        imageProcessor: passthroughImageProcessor,
        urlStrategy: (media) => {
            return `https://media.example.co.uk${media.key}`;
        },
    },
    // ...other config
}));
```

To use the original image, you'd use the URL that the media object returns (what the `urlStrategy` creates). To optimize the image via Cloudflare Images on your frontend, you'd use the media `key` to construct the URL:

```text
https://media.example.co.uk/cdn-cgi/image/width=800,quality=75,format=auto/${mediaKey}
```

## Sending Emails

For sending emails in Cloudflare Workers, the best first-party solution we have currently is to use our [Resend](https://lucidjs.build/en/cms/docs/plugins/resend) plugin. If you'd like to use a different email service, you'll need to implement your own email sending logic. You can find out more information on how to do this on the [Configuring Lucid CMS](https://lucidjs.build/en/cms/docs/configuration/configuring-lucid-cms) page.