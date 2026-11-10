import { loadConfigFile } from "@lucidcms/core/build";
import type { HarnessEnv } from "../../../shared/config.ts";

/**
 * Loads a setup's config in this process with the given environment, instead of the process's own.
 * `validateEnv: false` reads a config whose environment only exists in its runtime, such as a
 * Worker's bindings, which is enough to inspect it but not to run it.
 */
const loadSetupConfig = (options: {
	configPath: string;
	env: HarnessEnv;
	validateEnv?: boolean;
}) =>
	loadConfigFile({
		path: options.configPath,
		silent: true,
		validateEnvSchema: options.validateEnv ?? true,
		loadEnv: async () => options.env,
	});

export default loadSetupConfig;
