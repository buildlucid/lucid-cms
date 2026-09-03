// @ts-check
import cloudflare from "@astrojs/cloudflare";
import lucidCMS from "@lucidcms/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
	output: "server",
	session: false,
	adapter: cloudflare({
		configPath: "./wrangler.jsonc",
		imageService: "passthrough",
	}),
	integrations: [lucidCMS()],
});
