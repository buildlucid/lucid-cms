# Lucid CMS - Astro

The official Astro integration for Lucid CMS.

## Setup

Add the integration to `astro.config.*`, with the Astro adapter for your Lucid runtime:

```js
import node from "@astrojs/node";
import lucidCMS from "@lucidcms/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [lucidCMS()],
});
```

Lucid needs nothing Astro-specific in `lucid.config.*`: Lucid's CLI finds this package in your dependencies. Run the project with `astro dev`, `astro build` and `astro preview`, which `lucidcms dev`, `build` and `serve` point you to. Lucid's other commands, such as `lucidcms migrate` and `lucidcms seed`, run through Astro's Vite config, so they use the same adapter, options and bindings as `astro dev`.

On Cloudflare, wrap the Worker in `cloudflare.config.ts` with `withLucid`. See the [Cloudflare runtime](../runtime-cloudflare/README.md#astro).

## Toolkit

```ts
import getToolkit from "@lucidcms/astro/toolkit";

const toolkit = await getToolkit(Astro);
```
