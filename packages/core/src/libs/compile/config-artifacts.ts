export const configArtifactEntries = {
	config: "lucid/config",
	env: "lucid/env",
	db: "lucid/db",
	runtime: "lucid/runtime",
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
