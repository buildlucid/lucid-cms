import type {
	GetEnvVarsLogger,
	LazyRuntimeAdapterReference,
	RuntimeAdapter,
	RuntimeAdapterCLI,
	RuntimeAdapterCLIModule,
	RuntimeAdapterEnvLoadResult,
	RuntimeAdapterEnvModule,
	RuntimeAdapterRootModule,
	RuntimeAdapterRuntimeModule,
	RuntimeConfigureLucid,
} from "./types.js";

const adapterModuleCache = new Map<string, Promise<unknown>>();

/**
 * Adapter capabilities are imported on demand so config loading can stay
 * lightweight in hosted environments that only need one slice of adapter code.
 */
const loadAdapterModule = async <T>(modulePath: string): Promise<T> => {
	const cachedModule = adapterModuleCache.get(modulePath);
	if (cachedModule) {
		return cachedModule as Promise<T>;
	}

	const modulePromise = import(/* @vite-ignore */ modulePath) as Promise<T>;
	adapterModuleCache.set(modulePath, modulePromise);
	return modulePromise;
};

const getAdapterSubpath = (
	adapterFrom: string,
	subpath: "env" | "cli" | "runtime",
) => `${adapterFrom}/${subpath}`;

const getDefaultExport = <T>(
	module:
		| {
				default?: T;
		  }
		| undefined,
): T | undefined => module?.default;

/**
 * The root adapter package stays lightweight and only exposes config metadata
 * such as configureLucid and type-generation hints.
 */
export const getAdapterRootModule = async (
	adapterFrom: string,
): Promise<RuntimeAdapterRootModule> => {
	const module =
		await loadAdapterModule<Partial<RuntimeAdapterRootModule>>(adapterFrom);

	if (typeof module.configureLucid !== "function") {
		throw new Error(
			`Lucid could not load the configureLucid() export from "${adapterFrom}".`,
		);
	}

	return module as RuntimeAdapterRootModule;
};

export const getAdapterConfigureLucid = async (
	modulePath: string,
): Promise<RuntimeConfigureLucid> => {
	const module = await loadAdapterModule<
		Partial<RuntimeAdapterRootModule> & {
			default?: RuntimeConfigureLucid;
		}
	>(modulePath);
	const configureLucid = module.configureLucid ?? getDefaultExport(module);

	if (typeof configureLucid !== "function") {
		throw new Error(
			`Lucid could not load the configureLucid() export from "${modulePath}".`,
		);
	}

	return configureLucid;
};

/**
 * Env loading is isolated because some runtimes need host-specific bindings
 * while others only need dotenv-style process env hydration.
 */
export const getAdapterEnv = async (
	adapter: LazyRuntimeAdapterReference<string>,
	props: {
		logger: GetEnvVarsLogger;
	},
): Promise<RuntimeAdapterEnvLoadResult> => {
	const modulePath = getAdapterSubpath(adapter.from, "env");
	const module = await loadAdapterModule<RuntimeAdapterEnvModule>(modulePath);
	const loadEnv = module.getEnvVars ?? getDefaultExport(module);

	if (typeof loadEnv !== "function") {
		throw new Error(
			`Lucid could not load the env adapter export from "${modulePath}".`,
		);
	}

	const result = await loadEnv({
		logger: props.logger,
		options: adapter.options as Record<string, unknown> | undefined,
	});

	if (
		result &&
		typeof result === "object" &&
		Object.hasOwn(result, "env") &&
		typeof result.env === "object" &&
		result.env !== null
	) {
		return result as RuntimeAdapterEnvLoadResult;
	}

	return {
		env: result as RuntimeAdapterEnvLoadResult["env"],
	};
};

/**
 * CLI handlers are only needed for standalone Lucid commands, so we resolve
 * them separately from config loading and pass through any env-loader state.
 */
export const getAdapterCLI = async (
	adapter: LazyRuntimeAdapterReference<string>,
	props?: {
		envResult?: RuntimeAdapterEnvLoadResult;
	},
): Promise<RuntimeAdapterCLI> => {
	const modulePath = getAdapterSubpath(adapter.from, "cli");
	const module = await loadAdapterModule<RuntimeAdapterCLIModule>(modulePath);
	const loadCLI = module.cli ?? getDefaultExport(module);

	if (typeof loadCLI !== "function") {
		throw new Error(
			`Lucid could not load the cli adapter export from "${modulePath}".`,
		);
	}

	return loadCLI({
		options: adapter.options as Record<string, unknown> | undefined,
		envResult: props?.envResult,
	});
};

/**
 * Runtime metadata stays separate so hosted integrations can detect runtime
 * compatibility without pulling CLI or env-only dependencies into memory.
 */
export const getAdapterRuntime = async (
	adapter: LazyRuntimeAdapterReference<string>,
): Promise<RuntimeAdapter> => {
	const modulePath = getAdapterSubpath(adapter.from, "runtime");
	const module =
		await loadAdapterModule<RuntimeAdapterRuntimeModule>(modulePath);
	const loadRuntime = module.runtime ?? getDefaultExport(module);

	if (typeof loadRuntime !== "function") {
		throw new Error(
			`Lucid could not load the runtime adapter export from "${modulePath}".`,
		);
	}

	return loadRuntime({
		options: adapter.options as Record<string, unknown> | undefined,
	});
};
