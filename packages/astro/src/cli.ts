import path from "node:path";
import { LucidError } from "@lucidcms/core/runtime";
import type { HostCliIntegration } from "@lucidcms/core/vite";
import { getViteConfig } from "astro/config";

/** Provides Astro commands and task-server Vite config to Lucid's CLI through the package's `lucid.host` entry. */
const astroCli: HostCliIntegration = {
	name: "Astro",
	commands: {
		dev: "astro dev",
		build: "astro build",
		preview: "astro preview",
	},
	viteConfig: async ({ configPath, remote }) => {
		if (remote) {
			throw new LucidError({
				message:
					"`--remote` isn't supported in Astro projects, where Astro's adapter connects the runtime's bindings. Configure remote bindings through it instead.",
			});
		}
		// Astro's config, with its integrations, so tasks share `astro dev`'s adapter, bindings and local state.
		return getViteConfig(
			{},
			{ root: path.dirname(configPath), logLevel: "warn" },
		)({ command: "serve", mode: "development" });
	},
};

export default astroCli;
