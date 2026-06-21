// @ts-check
import cloudflare from "@astrojs/cloudflare";
import lucidCMS from "@lucidcms/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
	output: "server",
	adapter: cloudflare({
		configPath: "./.lucid/wrangler.jsonc",
		imageService: "passthrough",
		prerenderEnvironment: "node",
		sessionKVBindingName: "LUCID_KV",
	}),
	integrations: [lucidCMS()],
});
