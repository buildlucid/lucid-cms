import constants from "../../constants/constants.js";

export const configArtifactEntries = {
	config: `${constants.build.directory}/config`,
	env: `${constants.build.directory}/env`,
	db: `${constants.build.directory}/db`,
	runtime: `${constants.build.directory}/runtime`,
} as const;

export type ConfigArtifactKey = keyof typeof configArtifactEntries;

export type PreparedConfigArtifacts = Record<ConfigArtifactKey, string>;

/**
 * Returns import paths for the generated split config modules.
 */
export const getConfigArtifactImportPaths = (prefix = ".") =>
	Object.fromEntries(
		Object.entries(configArtifactEntries).map(([key, entry]) => [
			key,
			`${prefix}/${entry}.js`,
		]),
	) as Record<ConfigArtifactKey, string>;
