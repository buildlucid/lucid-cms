import path from "node:path";
import { createJiti } from "jiti";
import { LucidError } from "../../utils/errors/index.js";
import getConfigPath from "../config/get-config-path.js";
import { resolveConfigDefinition } from "../config/resolve-config-definition.js";
import loadIntegrationEnv from "../vite/load-integration-env.js";
import type { ResourceKind } from "./types.js";

/** Reads the configured resource creation directory using Vite's config env, without collecting resources or requiring the directory to exist. */
export const getResourceDirectory = async (kind: ResourceKind) => {
	const configPath = getConfigPath(process.cwd());
	const projectRoot = path.dirname(configPath);
	const loader = createJiti(import.meta.url, {
		fsCache: false,
		moduleCache: false,
	});
	const { config } = await resolveConfigDefinition({
		definition: await loader.import<unknown>(configPath, { default: true }),
		validateEnvSchema: false,
		loadEnv: loadIntegrationEnv(projectRoot),
		// Only the resource directories are read, so warnings from plugins setting up are left to the runtime to report.
		processConfigOptions: { mode: "build", logger: { level: "error" } },
	});
	const directory = config.directories[kind];
	if (directory === false)
		throw new LucidError({
			message: `Cannot create ${kind}: its directory is disabled. Set directories.${kind} first.`,
		});
	return path.resolve(projectRoot, directory);
};
