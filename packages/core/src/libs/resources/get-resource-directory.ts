import path from "node:path";
import { createJiti } from "jiti";
import { LucidError } from "../../utils/errors/index.js";
import getConfigPath from "../config/get-config-path.js";
import { resolveConfigDefinition } from "../config/resolve-config-definition.js";
import type { ResourceKind } from "./types.js";

/** Reads a creation destination without collecting resources, so a configured directory may not exist yet. */
export const getResourceDirectory = async (kind: ResourceKind) => {
	const configPath = getConfigPath(process.cwd());
	const projectRoot = path.dirname(configPath);
	const loader = createJiti(import.meta.url, {
		fsCache: false,
		moduleCache: false,
	});
	const { config } = await resolveConfigDefinition({
		definition: await loader.import<unknown>(configPath, { default: true }),
		configPath,
		projectRoot,
		validateEnvSchema: false,
		processConfigOptions: { mode: "build" },
	});
	const directory = config.directories[kind];
	if (directory === false)
		throw new LucidError({
			message: `Cannot create ${kind}: its directory is disabled. Set directories.${kind} first.`,
		});
	return path.resolve(projectRoot, directory);
};
