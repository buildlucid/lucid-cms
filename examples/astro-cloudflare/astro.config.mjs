// @ts-check
import cloudflare from "@astrojs/cloudflare";
import lucidCMS from "@lucidcms/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
	output: "static",
	adapter: cloudflare({
		imageService: "passthrough",
		prerenderEnvironment: "node",
	}),
	integrations: [lucidCMS()],
});
