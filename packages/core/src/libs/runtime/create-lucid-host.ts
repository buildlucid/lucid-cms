import type z from "zod";
import type { ResolvedLucidConfig } from "../../types/config.js";
import { LucidError } from "../../utils/errors/index.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type {
	CreateServiceContextOptions,
	ServiceContext,
} from "../../utils/services/types.js";
import { resolveConfigDefinition } from "../config/resolve-config-definition.js";
import type LucidDatabase from "../db/client/lucid-database.js";
import createLucidDatabase from "../db/create-lucid-database.js";
import type { DatabaseConnection } from "../db/types.js";
import createApp from "../http/app.js";
import type { HttpExtension } from "../http/types.js";
import prepareTranslations from "../i18n/prepare-translations.js";
import type { TranslationBundles, TranslationStore } from "../i18n/types.js";
import createToolkit from "../toolkit/create-toolkit.js";
import type { Toolkit } from "../toolkit/types.js";
import createLucidAdapters, {
	type LucidAdapterOverrides,
} from "./create-lucid-adapters.js";
import parseEnv from "./parse-env.js";
import type {
	AdapterKeys,
	AdapterRuntimeContext,
	DatabaseConnectionScope,
	EnvironmentVariables,
	LucidConfigDefinition,
	LucidConfigDefinitionMeta,
} from "./types.js";

type CreateLucidHostSharedOptions = {
	runtimeContext: AdapterRuntimeContext;
	/** Adapter instances to use instead of their configured equivalents. */
	adapterOverrides?: LucidAdapterOverrides;
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
				env?: Record<string, unknown>;
				translationBundles?: TranslationBundles;
				meta?: LucidConfigDefinitionMeta;
		  }
		| {
				config: ResolvedLucidConfig;
				translationStore: TranslationStore;
				env?: EnvironmentVariables;
		  }
	);

/** One request, scheduled event or other runtime invocation of a Lucid host. */
export type LucidInvocation = {
	/** Returns the fully initialized service context for this invocation. */
	getServiceContext(
		request?: CreateServiceContextOptions["request"],
	): Promise<ServiceContext>;
	/** Returns a public toolkit backed by this invocation. */
	getToolkit(
		request?: CreateServiceContextOptions["request"],
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
	config: ResolvedLucidConfig;
	env?: EnvironmentVariables;
	runtimeContext: AdapterRuntimeContext;
	adapterKeys: AdapterKeys;
	translationStore: TranslationStore;
	issues: Awaited<ReturnType<typeof createApp>>["issues"];
	createInvocation(options?: {
		env?: Record<string, unknown>;
	}): LucidInvocation;
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
					rawEnv: options.env,
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
	const invocationEnvs = new WeakMap<
		Record<string, unknown>,
		EnvironmentVariables
	>();
	if (resolved.env) {
		invocationEnvs.set(resolved.env, resolved.env);
		if (resolved.rawEnv) invocationEnvs.set(resolved.rawEnv, resolved.env);
	}
	const resolveInvocationEnv = (
		rawEnv: Record<string, unknown> | undefined,
	) => {
		if (!rawEnv) return resolved.env;
		const cached = invocationEnvs.get(rawEnv);
		if (cached) return cached;
		const env =
			parseEnv(
				rawEnv,
				"definition" in options ? options.envSchema : undefined,
			) ?? rawEnv;
		invocationEnvs.set(rawEnv, env);
		invocationEnvs.set(env, env);
		return env;
	};
	const translationStore =
		"translationStore" in options
			? options.translationStore
			: (
					await prepareTranslations({
						config: resolved.config,
						bundles: options.translationBundles,
					})
				).translationStore;

	const adapters = await createLucidAdapters({
		config: resolved.config,
		env: resolved.env,
		runtimeContext: options.runtimeContext,
		overrides: options.adapterOverrides,
	});
	let app: Awaited<ReturnType<typeof createApp>>;

	try {
		app = await createApp({
			config: resolved.config,
			translationStore,
			env: resolved.env,
			runtimeContext: options.runtimeContext,
			adapters: adapters.instances,
			http: options.http,
		});
	} catch (error) {
		await adapters.destroy();
		throw error;
	}

	let runtimeDatabasePromise: Promise<DatabaseConnection> | undefined;
	let runtimeLucidDatabasePromise: Promise<LucidDatabase> | undefined;
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

	const getRuntimeLucidDatabase = () => {
		if (!runtimeLucidDatabasePromise) {
			runtimeLucidDatabasePromise = getRuntimeDatabase()
				.then((database) =>
					createLucidDatabase({
						client: database.client,
						adapter: resolved.config.db,
						collections: resolved.config.collections,
						tables: resolved.config.tables,
					}),
				)
				.catch((error) => {
					runtimeLucidDatabasePromise = undefined;
					throw error;
				});
		}
		return runtimeLucidDatabasePromise;
	};

	return {
		config: resolved.config,
		env: resolved.env,
		runtimeContext: options.runtimeContext,
		adapterKeys: {
			queue: adapters.instances.queue.key,
			kv: adapters.instances.kv.key,
			mediaStorage: adapters.instances.mediaStorage?.key ?? null,
			mediaDelivery: adapters.instances.mediaDelivery.key,
			email: adapters.instances.email.key,
			database: resolved.config.db.adapter,
		},
		translationStore,
		issues: app.issues,
		createInvocation: (invocationOptions?: {
			env?: Record<string, unknown>;
		}): LucidInvocation => {
			if (destroyed) {
				throw new LucidError({
					message: "Cannot use a Lucid host after it has been destroyed.",
				});
			}
			const env = resolveInvocationEnv(invocationOptions?.env);
			let invocationDatabasePromise: Promise<DatabaseConnection> | undefined;
			let invocationLucidDatabasePromise: Promise<LucidDatabase> | undefined;
			let invocationDestroyed = false;
			let invocationDestroyPromise: Promise<void> | undefined;

			const getDatabase = () => {
				if (destroyed) {
					throw new LucidError({
						message: "Cannot use a Lucid host after it has been destroyed.",
					});
				}
				if (invocationDestroyed) {
					throw new LucidError({
						message:
							"Cannot use a Lucid invocation after it has been destroyed.",
					});
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

			const getLucidDatabase = () => {
				if (options.databaseScope === "runtime") {
					return getRuntimeLucidDatabase();
				}
				if (!invocationLucidDatabasePromise) {
					invocationLucidDatabasePromise = getDatabase()
						.then((database) =>
							createLucidDatabase({
								client: database.client,
								adapter: resolved.config.db,
								collections: resolved.config.collections,
								tables: resolved.config.tables,
							}),
						)
						.catch((error) => {
							invocationLucidDatabasePromise = undefined;
							throw error;
						});
				}
				return invocationLucidDatabasePromise;
			};

			const getServiceContext = async (
				request?: CreateServiceContextOptions["request"],
			): Promise<ServiceContext> => {
				const [database, db] = await Promise.all([
					getDatabase(),
					getLucidDatabase(),
				]);
				return createServiceContext({
					config: resolved.config,
					database,
					db,
					translationStore,
					env,
					runtimeContext: options.runtimeContext,
					queue: adapters.instances.queue,
					kv: adapters.instances.kv,
					mediaStorage: adapters.instances.mediaStorage,
					mediaDelivery: adapters.instances.mediaDelivery,
					email: adapters.instances.email,
					request,
				});
			};

			const invocation: LucidInvocation = {
				getServiceContext,
				getToolkit: async (request) =>
					createToolkit(await getServiceContext(request)),
				handle: async (handleOptions): Promise<Response> => {
					const db = await getLucidDatabase();
					return app.handle({
						request: handleOptions.request,
						db,
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
				await Promise.allSettled([
					app.destroy(),
					adapters.destroy(),
					database?.destroy(),
				]);
			})();
			return destroyPromise;
		},
	} satisfies LucidHost;
};

export default createLucidHost;
