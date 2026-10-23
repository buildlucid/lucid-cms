import { createRequire } from "node:module";
import path from "node:path";
import type { LucidAstroIntegrationBridge } from "@lucidcms/astro/types";
import { LucidError } from "@lucidcms/core/runtime";
import type { Plugin } from "vite";

const serverEntryId = "virtual:lucid/astro-node-server";

/** Build-time Astro bridge for the Node runtime. */
const nodeAstroIntegration = {
	validateAdapter(adapter) {
		if (!adapter?.name.toLowerCase().includes("node")) {
			throw new LucidError({
				message:
					"The Lucid Node runtime requires an Astro Node adapter. Add @astrojs/node to astro.config.*.",
			});
		}
	},
	/** Supplies Astro Vite settings that replace the built Node adapter entry with a plugin-provided entry that also starts Lucid's job scheduler. */
	vite(props) {
		if (props.command !== "build") return {};

		// Imported by its resolved path, as the alias would otherwise point the entry at itself.
		const astroServerPath = createRequire(
			path.join(props.project.projectRoot, "package.json"),
		).resolve("@astrojs/node/server.js");
		const serverEntry: Plugin = {
			name: "lucid:astro-node-server",
			resolveId: {
				filter: { id: /^virtual:lucid\/astro-node-server$/ },
				handler: () => `\0${serverEntryId}`,
			},
			load: {
				filter: { id: /^\0virtual:lucid\/astro-node-server$/ },
				handler:
					() => `import { createNodeJobScheduler } from "@lucidcms/runtime-node";
import { createLucidInvocation } from ${JSON.stringify(props.runtimeModuleId)};

export { handler, options, startServer } from ${JSON.stringify(astroServerPath)};

const jobScheduler = createNodeJobScheduler({
	createInvocation: async () => (await createLucidInvocation()).invocation,
});
jobScheduler.start();
`,
			},
		};

		return {
			plugins: [serverEntry],
			aliases: { "@astrojs/node/server.js": serverEntryId },
		};
	},
} satisfies LucidAstroIntegrationBridge;

export default nodeAstroIntegration;
