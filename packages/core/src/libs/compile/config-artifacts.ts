import constants from "../../constants/constants.js";

export const configArtifactEntries = {
	config: `${constants.build.directory}/config`,
	env: `${constants.build.directory}/env`,
	db: `${constants.build.directory}/db`,
	runtime: `${constants.build.directory}/runtime`,
} as const;

export type ConfigArtifactKey = keyof typeof configArtifactEntries;

export type PreparedConfigArtifacts = Record<ConfigArtifactKey, string>;

export type BuildDataKey = keyof typeof constants.build.dataFiles;

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

/**
 * Returns import paths for the build's JSON data files, such as `./lucid/translations.json`, for server entries beside the `lucid` folder.
 */
export const getBuildDataImportPaths = (prefix = ".") =>
	Object.fromEntries(
		Object.entries(constants.build.dataFiles).map(([key, file]) => [
			key,
			`${prefix}/${constants.build.directory}/${file}`,
		]),
	) as Record<BuildDataKey, string>;
