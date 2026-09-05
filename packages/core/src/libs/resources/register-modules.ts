import type { LucidConfig } from "../../types/config.js";
import type { ResourceModules } from "./types.js";

/** Combines discovered definitions with explicitly registered project resources. */
export const registerResourceModules = (
	config: LucidConfig,
	resources: ResourceModules,
): LucidConfig => ({
	...config,
	collections: [...(config.collections ?? []), ...resources.collections],
	tables: [...(config.tables ?? []), ...resources.tables],
	http: {
		...config.http,
		routes: [...(config.http?.routes ?? []), ...resources.routes],
	},
	hooks: [...(config.hooks ?? []), ...resources.hooks],
	jobs: {
		...config.jobs,
		definitions: [...(config.jobs?.definitions ?? []), ...resources.jobs],
	},
});
