import type { ServiceContext } from "../../utils/services/types.js";
import validateEnvVars from "../cli/services/validate-env-vars.js";
import loadConfigFile from "../config/load-config-file.js";
import { passthroughKVAdapter } from "../kv-adapter/index.js";
import { passthroughQueueAdapter } from "../queue-adapter/index.js";
import type { CreateToolkitOptions } from "./types.js";
import { defaultToolkitRequestUrl } from "./utils.js";

export const createToolkitServiceContext = async (
	options?: CreateToolkitOptions,
): Promise<ServiceContext> => {
	const loadedConfig = await loadConfigFile({
		path: options?.configPath,
		silent: true,
	});

	const envValid = await validateEnvVars({
		envSchema: loadedConfig.envSchema,
		env: loadedConfig.env,
	});

	if (!envValid) {
		throw new Error(
			"Lucid toolkit could not validate the environment variables for lucid.config.ts.",
		);
	}

	return {
		db: {
			client: loadedConfig.config.db.client,
		},
		config: loadedConfig.config,
		env: loadedConfig.env ?? null,
		queue: passthroughQueueAdapter(),
		kv: passthroughKVAdapter(),
		requestUrl:
			options?.requestUrl ??
			loadedConfig.config.baseUrl ??
			defaultToolkitRequestUrl,
	};
};
