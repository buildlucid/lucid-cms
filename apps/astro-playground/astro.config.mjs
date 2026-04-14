// @ts-check

import cloudflare from "@astrojs/cloudflare";
import node from "@astrojs/node";
import lucid from "@lucidcms/astro";
import { defineConfig } from "astro/config";

const runtime =
	process.env.ASTRO_RUNTIME === "cloudflare" ? "cloudflare" : "node";
const output = process.env.ASTRO_OUTPUT === "server" ? "server" : "static";

// https://astro.build/config
export default defineConfig({
	output,
	adapter:
		runtime === "cloudflare"
			? cloudflare()
			: node({ mode: "standalone" }),
	integrations: [lucid()],
});
