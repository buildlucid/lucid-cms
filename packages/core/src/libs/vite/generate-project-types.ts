import generateTypes from "../type-generation/index.js";
import type { LucidViteProject } from "./types.js";

/** Writes the generated type files for a project loaded the way Lucid's Vite plugin loads it. */
const generateProjectTypes = (project: LucidViteProject) =>
	generateTypes({
		envSchema: project.envSchema,
		configPath: project.configPath,
		projectRoot: project.projectRoot,
		translationFiles: project.resources.files.translations,
		access: project.config.access,
		collections: project.config.collections,
		localization: project.config.localization,
	});

export default generateProjectTypes;
