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

Then declare Astro as the host in `lucid.config.*`, so Lucid's CLI leaves the server and builds to Astro:

```ts
import { astroHost } from "@lucidcms/astro/host";

export default defineConfig({
  runtime: node(),
  host: astroHost,
  db: sqlite,
  config: () => ({}),
});
```

Run the project with `astro dev`, `astro build` and `astro preview`. Lucid's other commands, such as `lucidcms migrate` and `lucidcms seed`, run through Astro's Vite config, so they use the same adapter and bindings as `astro dev`.

On Cloudflare, also name Astro's Worker in `cloudflare.config.ts` and wrap it with `withLucid`. See the [Cloudflare runtime](../runtime-cloudflare/README.md#astro).

## Toolkit

```ts
import getToolkit from "@lucidcms/astro/toolkit";

const toolkit = await getToolkit(Astro);
```
