import { destroyRuntimeHosts } from "../internal/runtime.js";
import type { ResolvedLucidProject } from "./project.js";

/** Releases resources owned by the runtime-specific Astro integration. */
export const teardownProject = async (
	project: ResolvedLucidProject,
	command: "dev" | "build",
) => {
	await project.integrationBridge.teardown?.({
		adapter: project.loaded.adapter,
		command,
	});
};

/** Releases both generated Lucid hosts and runtime-specific dev resources. */
export const teardownDevProject = async (project: ResolvedLucidProject) => {
	try {
		await destroyRuntimeHosts(project.hostId);
	} finally {
		await teardownProject(project, "dev");
	}
};
