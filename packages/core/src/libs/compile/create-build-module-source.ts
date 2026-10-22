import path from "node:path";
import constants from "../../constants/constants.js";
import type { PreparedConfigArtifacts } from "./config-artifacts.js";

const importPath = (filePath: string) =>
	JSON.stringify(filePath.split(path.sep).join("/"));

/** Creates `lucid:build` from split config and data modules as a `LucidBuild`, importing data through `build.dataModulePrefix` for bundling or runtime loading. */
const createBuildModuleSource = (props: {
	configArtifacts: PreparedConfigArtifacts;
}) => {
	const { dataFiles, dataModulePrefix } = constants.build;
	const dataFile = (file: string) =>
		JSON.stringify(`${dataModulePrefix}${file}`);

	return `import config, { configure } from ${importPath(props.configArtifacts.config)};
import { env as envSchema } from ${importPath(props.configArtifacts.env)};
import db from ${importPath(props.configArtifacts.db)};
import runtime from ${importPath(props.configArtifacts.runtime)};
import translationBundles from ${dataFile(dataFiles.translations)} with { type: "json" };
import emailTemplates from ${dataFile(dataFiles.emailTemplates)} with { type: "json" };
import pluginData from ${dataFile(dataFiles.pluginData)} with { type: "json" };
import pluginModules from ${dataFile(dataFiles.pluginModules)};

export default {
	host: {
		definition: { runtime, db, config, configure },
		envSchema,
		translationBundles,
		meta: { emailTemplates },
	},
	pluginData,
	pluginModules,
};
`;
};

export default createBuildModuleSource;
