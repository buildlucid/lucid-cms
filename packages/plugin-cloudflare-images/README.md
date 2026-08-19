# Lucid CMS - Cloudflare Images Plugin

> The official Cloudflare Images media delivery plugin for Lucid CMS

This plugin registers a Lucid media delivery adapter backed by the Cloudflare Images binding. It transforms raw image bytes streamed from Lucid's storage adapter, so the source does not need a public URL.

## Installation

```bash
npm install @lucidcms/plugin-cloudflare-images
```

## Setup

```ts
import { configureLucid } from "@lucidcms/core";
import { cloudflareImagesPlugin } from "@lucidcms/plugin-cloudflare-images";
import { cloudflare } from "@lucidcms/runtime-cloudflare";
import { d1 } from "@lucidcms/db-d1";

export default configureLucid({
  runtime: cloudflare,
  db: d1,
  config: () => ({
    media: {
      images: {
        presets: {
          portrait: {
            width: 600,
            height: 800,
            fit: "cover",
            format: "webp",
            quality: 80,
            rotate: 90,
          },
        },
      },
    },
    plugins: [cloudflareImagesPlugin()],
  }),
});
```

Generated Wrangler configs automatically include:

```json
{
  "images": {
    "binding": "LUCID_IMAGES"
  }
}
```

Use `cloudflareImagesPlugin({ binding: "CUSTOM_IMAGES" })` to select another binding name. When `runtime: cloudflare({ wrangler: "./wrangler.jsonc" })` uses a manual config, add the matching `images` entry yourself; Lucid does not modify user-owned Wrangler files.

## Supported processing

Source images are deliberately restricted to JPEG, PNG, and WebP. Output supports JPEG, PNG, WebP, and AVIF. Cloudflare may fall back from AVIF for images it cannot encode quickly; the adapter reports the actual returned MIME type and extension.

The following fixed source limits are checked before transformation:

- Maximum input: 20 MiB (`20 * 1024 * 1024` bytes).
- Maximum area: 100,000,000 pixels.
- Maximum JPEG or PNG edge: 12,000 pixels.
