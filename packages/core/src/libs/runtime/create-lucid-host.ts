import type z from "zod";
import type { Config } from "../../types/config.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import { resolveConfigDefinition } from "../config/resolve-config-definition.js";
import type { DatabaseConnection } from "../db/types.js";
import createApp from "../http/app.js";
import type { HttpExtension } from "../http/types.js";
import prepareTranslations from "../i18n/prepare-translations.js";
import type { TranslationBundles, TranslationStore } from "../i18n/types.js";
import createToolkit from "../toolkit/create-toolkit.js";
import type {
	CreateToolkitServiceContextOptions,
	Toolkit,
} from "../toolkit/types.js";
import type {
	AdapterRuntimeContext,
	DatabaseConnectionScope,
	EnvironmentVariables,
	LucidConfigDefinition,
	LucidConfigDefinitionMeta,
} from "./types.js";

type CreateLucidHostSharedOptions = {
	runtimeContext: AdapterRuntimeContext;
	http?: {
		extensions?: HttpExtension[];
	};
	/** Determines who owns live database connections created by this host. */
	databaseScope: DatabaseConnectionScope;
};

/** Options used to create a Lucid instance within another framework or host. */
export type CreateLucidHostOptions = CreateLucidHostSharedOptions &
	(
		| {
				definition: LucidConfigDefinition;
				envSchema?: z.ZodType;
				env?: EnvironmentVariables;
				translationBundles?: TranslationBundles;
				meta?: LucidConfigDefinitionMeta;
		  }
		| {
				config: Config;
				translationStore: TranslationStore;
				env?: EnvironmentVariables;
		  }
	);

/** One request, scheduled event or other runtime invocation of a Lucid host. */
export type LucidInvocation = {
	/** Returns the fully initialized service context for this invocation. */
	getServiceContext(
		request?: CreateToolkitServiceContextOptions["request"],
	): Promise<ServiceContext>;
	/** Returns a public toolkit backed by this invocation. */
	getToolkit(
		request?: CreateToolkitServiceContextOptions["request"],
	): Promise<Toolkit>;
	/** Handles an HTTP request using this invocation's database connection. */
	handle(options: {
		request: Request;
		executionContext?: unknown;
		requestBindings?: object;
	}): Promise<Response>;
	/** Releases resources owned by this invocation. */
	destroy(): Promise<void>;
};

/** An initialized Lucid application host owned by an external runtime. */
export type LucidHost = {
	config: Config;
	env?: EnvironmentVariables;
	runtimeContext: AdapterRuntimeContext;
	translationStore: TranslationStore;
	issues: Awaited<ReturnType<typeof createApp>>["issues"];
	createInvocation(options?: { env?: EnvironmentVariables }): LucidInvocation;
	destroy(): Promise<void>;
};

/** Creates a fully initialized application host with explicit invocation lifecycles. */
const createLucidHost = async (
	options: CreateLucidHostOptions,
): Promise<LucidHost> => {
	const resolved =
		"config" in options
			? {
					config: options.config,
					env: options.env,
				}
			: await resolveConfigDefinition({
					definition: options.definition,
					envSchema: options.envSchema,
					env: options.env,
					meta: options.meta,
					processConfigOptions: {
						skipValidation: true,
					},
				});
	const translationStore =
		"translationStore" in options
			? options.translationStore
			: (
					await prepareTranslations({
						config: resolved.config,
						bundles: options.translationBundles,
					})
				).translationStore;
	const app = await createApp({
		config: resolved.config,
		translationStore,
		env: resolved.env,
		runtimeContext: options.runtimeContext,
		http: options.http,
	});
	let runtimeDatabasePromise: Promise<DatabaseConnection> | undefined;
	let destroyed = false;
	let destroyPromise: Promise<void> | undefined;
	const activeInvocations = new Set<LucidInvocation>();

	const createDatabase = (env?: EnvironmentVariables) =>
		resolved.config.db.connect(env ?? {});

	const getRuntimeDatabase = () => {
		if (!runtimeDatabasePromise) {
			runtimeDatabasePromise = Promise.resolve(
				createDatabase(resolved.env),
			).catch((error) => {
				runtimeDatabasePromise = undefined;
				throw error;
			});
		}
		return runtimeDatabasePromise;
	};

	const host: LucidHost = {
		config: resolved.config,
		env: resolved.env,
		runtimeContext: options.runtimeContext,
		translationStore,
		issues: app.issues,
		createInvocation: (invocationOptions?: {
			env?: EnvironmentVariables;
		}): LucidInvocation => {
			if (destroyed) {
				throw new Error("Cannot use a Lucid host after it has been destroyed.");
			}
			const env = invocationOptions?.env ?? resolved.env;
			let invocationDatabasePromise: Promise<DatabaseConnection> | undefined;
			let invocationDestroyed = false;
			let invocationDestroyPromise: Promise<void> | undefined;

			const getDatabase = () => {
				if (destroyed) {
					throw new Error(
						"Cannot use a Lucid host after it has been destroyed.",
					);
				}
				if (invocationDestroyed) {
					throw new Error(
						"Cannot use a Lucid invocation after it has been destroyed.",
					);
				}
				if (options.databaseScope === "runtime") {
					return getRuntimeDatabase();
				}
				if (!invocationDatabasePromise) {
					invocationDatabasePromise = Promise.resolve(
						createDatabase(env),
					).catch((error) => {
						invocationDatabasePromise = undefined;
						throw error;
					});
				}
				return invocationDatabasePromise;
			};

			const getServiceContext = async (
				request?: CreateToolkitServiceContextOptions["request"],
			): Promise<ServiceContext> => {
				const database = await getDatabase();
				return createServiceContext({
					config: resolved.config,
					database,
					translationStore,
					env,
					runtimeContext: options.runtimeContext,
					queue: app.queue,
					kv: app.kv,
					media: app.media,
					email: app.email,
					request,
				});
			};

			const invocation: LucidInvocation = {
				getServiceContext,
				getToolkit: async (request) =>
					createToolkit(await getServiceContext(request)),
				handle: async (handleOptions): Promise<Response> => {
					const database = await getDatabase();
					return app.handle({
						request: handleOptions.request,
						database,
						env,
						executionContext: handleOptions.executionContext,
						requestBindings: handleOptions.requestBindings,
					});
				},
				destroy: async () => {
					invocationDestroyPromise ??= (async () => {
						invocationDestroyed = true;
						try {
							if (
								options.databaseScope === "invocation" &&
								invocationDatabasePromise
							) {
								const result = await Promise.allSettled([
									invocationDatabasePromise,
								]);
								const connection = result[0];
								if (connection?.status === "fulfilled") {
									await Promise.allSettled([connection.value.destroy()]);
								}
							}
						} finally {
							activeInvocations.delete(invocation);
						}
					})();
					return invocationDestroyPromise;
				},
			};
			activeInvocations.add(invocation);
			return invocation;
		},
		destroy: async () => {
			destroyPromise ??= (async () => {
				destroyed = true;
				await Promise.allSettled(
					Array.from(activeInvocations, (invocation) => invocation.destroy()),
				);
				const [databaseResult] = await Promise.allSettled([
					runtimeDatabasePromise,
				]);
				const database =
					databaseResult.status === "fulfilled"
						? databaseResult.value
						: undefined;
				await Promise.allSettled([app.destroy(), database?.destroy()]);
			})();
			return destroyPromise;
		},
	};
	return host;
};

export default createLucidHost;
