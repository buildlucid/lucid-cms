import { buildModuleId } from "@lucidcms/core/build";
import type { Plugin } from "vite";
import constants from "../constants.js";
import type { ResolvedLucidProject } from "./project.js";

const resolvedId = `\0${constants.runtimeModuleId}`;

/** Serves the project's Astro runtime module for Lucid routes, middleware, toolkit and platform entries by importing `lucid:build` and the adapter's Astro bridge. */
const runtimeModulePlugin = (project: ResolvedLucidProject): Plugin => ({
	name: "lucid:astro-runtime",
	resolveId: {
		filter: { id: /^virtual:lucid\/astro-runtime$/ },
		handler: () => resolvedId,
	},
	load: {
		filter: { id: /^\0virtual:lucid\/astro-runtime$/ },
		handler: () => `import build from ${JSON.stringify(buildModuleId)};
import bridge from ${JSON.stringify(project.bridgeEntrypoint)};
import createAstroRuntime from "@lucidcms/astro/internal/create-astro-runtime";

const runtime = createAstroRuntime({ build, bridge, hostKey: ${JSON.stringify(project.hostId)} });

export const { createLucidInvocation, handle, getToolkit } = runtime;
if (import.meta.hot) import.meta.hot.dispose(runtime.destroy);
`,
	},
});

export default runtimeModulePlugin;
