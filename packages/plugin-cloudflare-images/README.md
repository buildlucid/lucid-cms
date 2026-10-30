# Lucid CMS - Cloudflare Images Plugin

> The official Cloudflare Images media delivery plugin for Lucid CMS

This plugin registers a Lucid media delivery adapter backed by the Cloudflare Images binding. It transforms raw image bytes streamed from Lucid's storage adapter, so the source does not need a public URL.

## Installation

```bash
npm install @lucidcms/plugin-cloudflare-images
```

## Setup

```ts
import { defineConfig } from "@lucidcms/core";
import { libsql } from "@lucidcms/db-libsql";
import { cloudflareImagesPlugin } from "@lucidcms/plugin-cloudflare-images";
import { cloudflare } from "@lucidcms/runtime-cloudflare";

export default defineConfig({
  runtime: cloudflare,
  db: libsql,
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

The plugin adds an Images binding named `LUCID_IMAGES` to the Worker. Use `cloudflareImagesPlugin({ binding: "CUSTOM_IMAGES" })` to select another binding name.

## Supported processing

Source images are deliberately restricted to JPEG, PNG, and WebP. Output supports JPEG, PNG, WebP, and AVIF. Cloudflare may fall back from AVIF for images it cannot encode quickly; the adapter reports the actual returned MIME type and extension.

The following fixed source limits are checked before transformation:

- Maximum input: 20 MiB (`20 * 1024 * 1024` bytes).
- Maximum area: 100,000,000 pixels.
- Maximum JPEG or PNG edge: 12,000 pixels.
