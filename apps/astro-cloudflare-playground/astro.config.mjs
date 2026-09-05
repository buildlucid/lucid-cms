// @ts-check
import cloudflare from "@astrojs/cloudflare";
import lucidCMS from "@lucidcms/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
	output: "server",
	session: false,
	vite: {
		environments: {
			ssr: {
				optimizeDeps: {
					// Avoid late dependency optimization restarting the worker during startup.
					include: [
						"astro/assets/services/noop",
						"astro/logger/console",
						"kysely/migration",
						"aws4fetch",
					],
				},
			},
		},
	},
	adapter: cloudflare({
		configPath: "./wrangler.jsonc",
		imageService: "passthrough",
	}),
	integrations: [lucidCMS()],
});
