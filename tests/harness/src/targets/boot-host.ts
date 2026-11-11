import {
	createLucidHost,
	handleHostRequest,
	prepareTranslations,
} from "@lucidcms/core/runtime";
import type { KyselyDB, ResolvedLucidConfig } from "@lucidcms/core/types";
import type { HarnessEnv } from "../../../shared/config.ts";
import loadSetupConfig from "./load-setup-config.ts";
import type { AdapterOverrides, Target } from "./types.ts";

/** The address an in-process CMS believes it is served from. Nothing listens on it. */
export const HOST_URL = "http://localhost:6543";

/** Loads a setup's config and runs the CMS inside this process, against the given database. */
const bootHost = async (options: {
	configPath: string;
	databaseUrl: string;
	/** The rest of what the setup's config reads, such as where sent emails go or a schema step. */
	env?: Omit<HarnessEnv, "HARNESS_DATABASE_URL" | "HARNESS_URL">;
	adapterOverrides?: AdapterOverrides;
}): Promise<
	Omit<Target, "outbox" | "uploads"> & { config: ResolvedLucidConfig }
> => {
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

	//* tests read the database through a connection of their own, opened on first use
	let connection: ReturnType<typeof host.config.db.connect> | undefined;
	const connect = () => {
		connection ??= host.config.db.connect(loaded.env);
		return connection;
	};

	return {
		url: HOST_URL,
		config: host.config,
		transport: (request) => handleHostRequest(host, { request, env: host.env }),
		query: async <Result>(use: (kysely: KyselyDB) => Promise<Result>) =>
			use((await connect()).client),
		close: async () => {
			await host.destroy();
			if (connection) {
				await (await connection).destroy();
			}
		},
	};
};

export default bootHost;
