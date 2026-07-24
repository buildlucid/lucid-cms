# Lucid CMS - Astro

The official Astro integration for Lucid CMS.


## Setup

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

## Toolkit

```ts
import getToolkit from "@lucidcms/astro/toolkit";

const toolkit = await getToolkit(Astro);
```
