import {
	createLucidHost,
	handleHostRequest,
	prepareTranslations,
} from "@lucidcms/core/runtime";
import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import loadSetupConfig from "./load-setup-config.ts";
import type { HostTargetOptions, Target } from "./types.ts";

/** The address an in-process CMS believes it is served from. Nothing listens on it. */
export const HOST_URL = "http://localhost:6543";

/** Loads a setup's config and runs the CMS inside this process, against the given database. */
const bootHost = async (
	options: {
		configPath: string;
		databaseUrl: string;
		/** The schema step to load the config with, for migration tests. */
		schemaStep?: string;
	} & HostTargetOptions,
): Promise<Target & { config: ResolvedLucidConfig }> => {
	const loaded = await loadSetupConfig({
		configPath: options.configPath,
		env: {
			HARNESS_DATABASE_URL: options.databaseUrl,
			HARNESS_URL: HOST_URL,
			HARNESS_SCHEMA_STEP: options.schemaStep,
		},
	});
	const { translationStore } = await prepareTranslations({
		config: loaded.config,
		files: loaded.resources.files.translations,
	});
	const host = await createLucidHost({
		config: loaded.config,
		translationStore,
		env: loaded.env,
		runtimeContext: loaded.runtimeContext,
		databaseScope: "runtime",
		adapterOverrides: options.adapterOverrides,
	});

	return {
		url: HOST_URL,
		config: host.config,
		transport: (request) => handleHostRequest(host, { request, env: host.env }),
		close: () => host.destroy(),
	};
};

export default bootHost;
