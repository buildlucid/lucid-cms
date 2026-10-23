import { createRequire } from "node:module";
import type { LucidViteProject } from "@lucidcms/core/vite";

/** Lists config, migration, seed and imported module files as real scan entries, preventing late optimization from restarting a Worker whose virtual entry cannot be scanned. */
const listOptimizeEntries = (
	project: LucidViteProject,
	/** Modules the Worker entry imports, resolved from the project. */
	modules: string[],
) => {
	const resolveFromProject = createRequire(project.configPath).resolve;
	return [
		project.configPath,
		...project.resources.files.migrations.map(({ path }) => path),
		...project.resources.files.seeds.map(({ path }) => path),
		...modules.map((specifier) => resolveFromProject(specifier)),
	];
};

export default listOptimizeEntries;
