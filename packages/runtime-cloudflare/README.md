# Lucid CMS - Cloudflare Runtime
> The official Cloudflare runtime for Lucid CMS

The Lucid CMS Cloudflare Workers runtime allows you to deploy your CMS to Cloudflare's edge computing platform. This is ideal for globally distributed applications that need low latency and high performance.

Using this runtime is by far the simplest way to deploy Lucid CMS.

## One-click Deploy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/buildlucid/lucid-cms/tree/master/templates/cloudflare-deploy)

Use the Cloudflare deploy template to deploy a Lucid CMS Worker with Postgres through Hyperdrive, KV, R2, and the Pages plugin.

## Installation

```bash
npm install @lucidcms/runtime-cloudflare
```

## Setup

Use the Cloudflare runtime in your `lucid.config.ts` file.

```typescript
import { defineConfig } from "@lucidcms/core";
import { cloudflare } from "@lucidcms/runtime-cloudflare";
import { libsql } from "@lucidcms/db-libsql";

export default defineConfig({
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
| `dev` | `{ port?: number; hostname?: string }` | Local Lucid dev server listen options |
| `bindings` | `object` | Explicit Cloudflare bindings to generate or override. Passing `true` for a binding uses Lucid's default binding name |
| `worker` | `{ name?: string; compatibilityDate?: string; compatibilityFlags?: string[] }` | The Worker's name, compatibility date and flags. The name defaults to the package name and the compatibility date to Lucid's tested `2026-06-30`. With a `cloudflare.config.ts`, its own name and compatibility date are used instead |

```typescript
export default defineConfig({
  runtime: cloudflare((env) => ({
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

## Development, Builds and Deploys

Lucid runs on Vite. The runtime's Vite integration uses the [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/), so `lucidcms dev` runs Lucid's Worker in workerd with local bindings. Local state, such as KV and R2 data, lives in `.cloudflare/state`.

`lucidcms build` writes the Worker and the admin to `.cloudflare/output`. Deploy that output with Cloudflare's [`cf` CLI](https://developers.cloudflare.com/cf/):

```bash
lucidcms build && cf deploy --prebuilt
```

Use `lucidcms dev` and `lucidcms build` rather than `cf dev` and `cf build`. `cf` doesn't recognise Lucid projects, so it would run Vite without Lucid.

Lucid passes its Worker, bindings, [agent run Durable Object](#agent-runs), cron trigger and the variables from your `env` schema to the plugin. Add a `cloudflare.config.ts` only for settings Lucid doesn't manage, such as a Hyperdrive binding.

## Database

Lucid needs a database with transactions. On Workers, use Postgres through [Hyperdrive](https://developers.cloudflare.com/hyperdrive/), declared in `cloudflare.config.ts`:

```typescript
// cloudflare.config.ts
import { bindings, defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "my-lucid-site",
    env: {
      LUCID_DB: bindings.hyperdrive({
        id: "HYPERDRIVE_ID",
        dev: { connectionString: "postgres://postgres:postgres@localhost:5432/lucid" },
      }),
    },
  },
});
```

```typescript
// lucid.config.ts
import { defineConfig, z } from "@lucidcms/core";
import { postgres } from "@lucidcms/db-postgres";
import { cloudflare } from "@lucidcms/runtime-cloudflare";

export const env = z.object({
  LUCID_DB: z.object({ connectionString: z.string() }),
});

export default defineConfig({
  runtime: cloudflare,
  db: postgres((env) => ({ url: env.LUCID_DB.connectionString })),
  config: () => ({
    // ...other config
  }),
});
```

Commands connect through the binding's local connection string. To migrate another database, such as production, set `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_LUCID_DB` for that command:

```bash
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_LUCID_DB="postgres://..." lucidcms migrate --yes
```

`--yes` accepts warning-level work such as core or plugin migrations. Destructive collection changes still fail unless you deliberately rerun with `--allow-destructive`, which also implies `--yes`.

## Commands

Commands such as `migrate`, `migrate:status`, `sync`, `seed`, `jobs:schedule` and plugin commands such as `site:build` run inside the Worker, through a short-lived dev server. They use the same bindings and local state as `lucidcms dev`, and can run while it does.

To use the deployed resources behind Lucid's bindings, such as KV and R2, pass `--remote` to `lucidcms dev` or a command:

```bash
lucidcms seed --all --remote
```

The database isn't one of Lucid's bindings, so `--remote` doesn't change which database a command uses. See [Database](#database) for running migrations against production.

In Astro projects, commands run through Astro's Vite config instead, so they use Astro's Cloudflare adapter and the bindings in `cloudflare.config.ts`, the same as `astro dev`. `--remote` isn't supported there. Set `dev: { remote: true }` on bindings in `cloudflare.config.ts` instead.

## Astro

Astro's Cloudflare adapter reads its Worker from `cloudflare.config.ts` alone. Name Astro's Worker in `entrypoint` and wrap the Worker in `withLucid`, which adds Lucid's Worker entry around it, its cron and queue triggers, the [agent run Durable Object](#agent-runs), and the bindings and secrets Lucid's adapters and plugins declare:

```typescript
// cloudflare.config.ts
import { withLucid } from "@lucidcms/runtime-cloudflare/config";
import { bindings, defineConfig } from "cf/config";

export default defineConfig({
  worker: withLucid({
    name: "my-site",
    compatibilityDate: "2026-06-30",
    entrypoint: "@astrojs/cloudflare/entrypoints/server",
    env: {
      LUCID_DB: bindings.hyperdrive({ id: "HYPERDRIVE_ID" }),
    },
  }),
});
```

Lucid's Worker entry runs Astro's Worker alongside Lucid's job scheduler and plugins' event handlers, such as the queue consumer, and exports the agent run Durable Object. The Worker's own settings and bindings come first. Deploy with `cf deploy`, which builds the project with `astro build`.

## Bindings

Cloudflare-aware Lucid packages can ask the runtime to generate their bindings. For example, `cloudflareKVPlugin()`, `cloudflareR2Plugin()`, `cloudflareQueuesPlugin()`, and `cloudflareImagesPlugin()` generate the matching KV, R2, Queue, and Images bindings with Lucid's convention names. Pass binding/resource details to the plugin or adapter that owns the feature:

```typescript
import { defineConfig } from "@lucidcms/core";
import { libsql } from "@lucidcms/db-libsql";
import { cloudflareR2Plugin } from "@lucidcms/plugin-cloudflare-r2";
import { cloudflare } from "@lucidcms/runtime-cloudflare";

export default defineConfig({
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

Use `bindings` when you want the runtime to force or override generated binding details:

```typescript
export default defineConfig({
  runtime: cloudflare({
    bindings: {
      images: true,
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

## Agent Runs

Agent runs execute in a Durable Object, one per run, rather than in the request or job that starts them. A run keeps going when the person who started it closes the chat, and everyone watching it streams its live events from the object. An alarm runs each part of a long run, and Cloudflare retries it if it fails.

Lucid exports the object from its Worker entry as `LucidAgentRuns`, with SQLite storage, and binds it as `LUCID_AGENT_RUNS`. It's declared even when you have no agents, so removing them later never needs a `deleted` export. If `cloudflare.config.ts` declares the binding or the export itself, Lucid leaves that one as it is.

## Media Storage

Due to the nature of Cloudflare Workers, they don't support file system operations. Because of this, you'll want to avoid the [LocalStorage](https://lucidjs.build/en/cms/docs/plugins/localstorage) plugin. For Cloudflare R2 bindings, we recommend the [Cloudflare R2](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-cloudflare-r2) plugin. For other object stores, the [S3](https://lucidjs.build/en/cms/docs/plugins/s3) plugin remains the generic option.

```typescript
import { defineConfig } from "@lucidcms/core";
import { libsql } from "@lucidcms/db-libsql";
import { cloudflareR2Plugin } from "@lucidcms/plugin-cloudflare-r2";
import { cloudflare } from "@lucidcms/runtime-cloudflare";

export default defineConfig({
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

Media is streamed through Lucid's `cdn` endpoint, including preset-driven image processing and fallback images. Sharp cannot run inside a deployed Worker, so use the first-party [Cloudflare Images plugin](https://github.com/buildlucid/lucid-cms/tree/master/packages/plugin-cloudflare-images) for on-demand processing:

```typescript
import { cloudflareImagesPlugin } from "@lucidcms/plugin-cloudflare-images";

export default defineConfig({
  runtime: cloudflare,
  db: libsql,
  config: () => ({
    plugins: [cloudflareImagesPlugin()],
  }),
});
```

## Sending Emails

For sending emails in Cloudflare Workers, the best first-party solution we have currently is to use our [Resend](https://lucidjs.build/en/cms/docs/plugins/resend) plugin. If you'd like to use a different email service, you'll need to implement your own email sending logic. You can find out more information on how to do this on the [Configuring Lucid CMS](https://lucidjs.build/en/cms/docs/configuration/configuring-lucid-cms) page.
