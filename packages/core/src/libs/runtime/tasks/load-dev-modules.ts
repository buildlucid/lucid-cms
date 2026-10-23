import type { LucidDevModule } from "../types.js";

/** Imports project files through the server environment, pairing each module with its path. */
const loadDevModules = (modules: LucidDevModule[]) =>
	Promise.all(
		modules.map(async (file) => ({
			path: file.path,
			module: await file.load(),
		})),
	);

export default loadDevModules;
