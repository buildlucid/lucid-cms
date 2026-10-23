import { LucidError } from "@lucidcms/core/runtime";
import {
	findLucidViteApi,
	importDefaultExport,
	type LucidViteProject,
} from "@lucidcms/core/vite";
import type { PluginOption } from "vite";
import type { LucidAstroIntegrationBridge } from "../types.js";

/** The Lucid project Astro serves, with the runtime adapter's Astro bridges. */
export type ResolvedLucidProject = {
	/** The project Lucid's Vite plugin loaded. */
	lucid: LucidViteProject;
	/** The runtime's Astro integration, which adds platform Vite settings and checks Astro's adapter. */
	integrationBridge: LucidAstroIntegrationBridge;
	/** The runtime's request bridge, which Lucid's runtime module serves Astro requests through. */
	bridgeEntrypoint: string;
	/** Identifies the project's hosts across reloads. */
	hostId: string;
};

const isIntegrationBridge = (
	value: unknown,
): value is LucidAstroIntegrationBridge =>
	typeof value === "object" &&
	value !== null &&
	"validateAdapter" in value &&
	typeof value.validateAdapter === "function";

/** Reads the project from the plugins `lucid()` returned and loads the runtime's Astro integration. */
const loadProject = async (
	plugins: PluginOption[],
): Promise<ResolvedLucidProject> => {
	const { project } = findLucidViteApi(plugins);
	const { adapter } = project;
	const bridgeEntrypoint = adapter.hosts?.astro?.entrypoint;
	const integrationEntrypoint = adapter.hosts?.astro?.integrationEntrypoint;
	if (!bridgeEntrypoint || !integrationEntrypoint) {
		throw new LucidError({
			message: `The ${adapter.key} runtime does not support Astro.`,
		});
	}

	// Resolved from the project, which depends on the runtime, rather than from this package.
	const integrationBridge = await importDefaultExport(integrationEntrypoint, {
		projectRoot: project.projectRoot,
		label: `The Astro integration of the ${adapter.key} runtime`,
	});
	if (!isIntegrationBridge(integrationBridge)) {
		throw new LucidError({
			message: `The Astro integration of the ${adapter.key} runtime is invalid.`,
		});
	}

	return {
		lucid: project,
		integrationBridge,
		bridgeEntrypoint,
		hostId: `${project.configPath}:${adapter.key}`,
	};
};

export default loadProject;
