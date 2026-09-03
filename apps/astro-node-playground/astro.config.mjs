// @ts-check

import node from "@astrojs/node";
import lucidCMS from "@lucidcms/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
	output: "server",
	session: false,
	adapter: node({ mode: "standalone" }),
	integrations: [lucidCMS()],
});
