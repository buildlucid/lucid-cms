import {
	createLucidHost,
	handleHostRequest,
	prepareTranslations,
} from "@lucidcms/core/runtime";
import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import type { HarnessEnv } from "../../../shared/config.ts";
import loadSetupConfig from "./load-setup-config.ts";
import type { HostTargetOptions, Target } from "./types.ts";

/** The address an in-process CMS believes it is served from. Nothing listens on it. */
export const HOST_URL = "http://localhost:6543";

/** Loads a setup's config and runs the CMS inside this process, against the given database. */
const bootHost = async (
	options: {
		configPath: string;
		databaseUrl: string;
		/** The rest of what the setup's config reads, such as where sent emails go or a schema step. */
		env?: Omit<HarnessEnv, "HARNESS_DATABASE_URL" | "HARNESS_URL">;
	} & Pick<HostTargetOptions, "adapterOverrides">,
): Promise<Omit<Target, "outbox"> & { config: ResolvedLucidConfig }> => {
	const loaded = await loadSetupConfig({
		configPath: options.configPath,
		env: {
			...options.env,
			HARNESS_DATABASE_URL: options.databaseUrl,
			HARNESS_URL: HOST_URL,
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
