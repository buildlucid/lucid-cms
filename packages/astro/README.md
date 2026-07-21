# Lucid CMS - Astro

The official Astro integration for Lucid CMS.

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

Server-side pages can access Lucid through the generated toolkit module:

```ts
import getToolkit from "@lucidcms/astro/toolkit";

const toolkit = await getToolkit();
```

`output: "static"` is supported when an Astro adapter is configured. Astro can prerender ordinary pages while Lucid's injected admin and API routes remain on demand.

Runtime adapters opt in without changes to this package by exposing an Astro bridge:

```ts
{
	hosts: {
		astro: {
			entrypoint: "@scope/runtime/astro",
			integrationEntrypoint: "@scope/runtime/astro-integration",
		},
	},
}
```

The request-time entrypoint implements `LucidAstroBridge`. The optional integration entrypoint contains build-only adapter validation and platform preparation, and can report generated files that Vite should ignore through `ignoredWatchFiles`.
