import path from "node:path";
import { createJiti } from "jiti";
import { LucidError } from "../../utils/errors/index.js";
import getConfigPath from "../config/get-config-path.js";
import { assertConfigDefinition } from "../config/resolve-config-definition.js";
import { defaultDiscovery } from "./defaults.js";
import { ResourceDiscoverySchema } from "./schema.js";
import type { ResourceKind } from "./types.js";

/** Reads a creation destination without loading resources or opening database connections. */
export const getResourceDirectory = async (kind: ResourceKind) => {
	const configPath = getConfigPath(process.cwd());
	const loader = createJiti(import.meta.url, {
		fsCache: false,
		moduleCache: false,
	});
	const definition = assertConfigDefinition(
		await loader.import<unknown>(configPath, { default: true }),
	);
	const discovery = ResourceDiscoverySchema.parse(
		definition.config(process.env).discovery,
	);
	const directory = discovery[kind] ?? defaultDiscovery[kind];
	if (directory === false)
		throw new LucidError({
			message: `Cannot create ${kind}: project discovery is disabled. Configure discovery.${kind} with a directory first.`,
		});
	return path.resolve(path.dirname(configPath), directory);
};
