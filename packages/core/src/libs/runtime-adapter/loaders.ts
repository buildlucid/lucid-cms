import { LucidError } from "../../utils/errors/index.js";
import type {
	DatabaseAdapterClass,
	DatabaseAdapterModule,
	LazyRuntimeAdapterReference,
	RuntimeAdapter,
	RuntimeAdapterModule,
	RuntimeConfigureLucid,
} from "./types.js";

const adapterModuleCache = new Map<string, Promise<unknown>>();

const loadModule = async <T>(modulePath: string): Promise<T> => {
	const cachedModule = adapterModuleCache.get(modulePath);
	if (cachedModule) {
		return cachedModule as Promise<T>;
	}

	const modulePromise = import(modulePath) as Promise<T>;
	adapterModuleCache.set(modulePath, modulePromise);
	return modulePromise;
};

const getDefaultExport = <T>(
	module:
		| {
				default?: T;
		  }
		| undefined,
): T | undefined => module?.default;

/**
 * Runtime adapter packages are discovered from user config, so we cache the
 * module promises here to avoid re-importing the same package during bootstrap
 * while still leaving the boundary dynamic for host-specific builds.
 */
export const getAdapterModule = async (
	adapterModule: string,
): Promise<RuntimeAdapterModule> => {
	const module = await loadModule<Partial<RuntimeAdapterModule>>(adapterModule);

	if (typeof module.configureLucid !== "function") {
		throw new LucidError({
			message: `Lucid could not load the configureLucid() export from "${adapterModule}".`,
		});
	}

	const adapter = module.adapter ?? getDefaultExport(module);

	if (typeof adapter !== "function") {
		throw new LucidError({
			message: `Lucid could not load the adapter() export from "${adapterModule}".`,
		});
	}

	return {
		configureLucid: module.configureLucid,
		adapter,
	};
};

/**
 * Hosted integrations can provide their own wrapper module so Lucid can keep
 * the runtime adapter identity while still applying host-specific config
 * shaping, like Astro's hosted email template handling.
 */
export const getAdapterConfigureLucid = async (
	modulePath: string,
): Promise<RuntimeConfigureLucid> => {
	const module = await loadModule<
		Partial<RuntimeAdapterModule> & {
			default?: RuntimeConfigureLucid;
		}
	>(modulePath);
	const configureLucid = module.configureLucid ?? getDefaultExport(module);

	if (typeof configureLucid !== "function") {
		throw new LucidError({
			message: `Lucid could not load the configureLucid() export from "${modulePath}".`,
		});
	}

	return configureLucid;
};

/**
 * Adapters stay as factories so they can keep per-instance state, like the
 * Cloudflare adapter's platform proxy, while config loading still describes
 * them declaratively via `adapter.module`.
 */
export const createAdapter = async (
	module: RuntimeAdapterModule,
	adapter: LazyRuntimeAdapterReference<string>,
): Promise<RuntimeAdapter> => {
	const adapterFactory = module.adapter;

	if (!adapterFactory) {
		throw new LucidError({
			message: "Lucid could not instantiate the configured adapter.",
		});
	}

	return adapterFactory(adapter.options as Record<string, unknown> | undefined);
};

export const getDatabaseAdapterClass = async (
	databaseModule: string,
): Promise<DatabaseAdapterClass> => {
	const module =
		await loadModule<Partial<DatabaseAdapterModule>>(databaseModule);
	const DatabaseAdapterCtor = getDefaultExport(module);

	if (typeof DatabaseAdapterCtor !== "function") {
		throw new LucidError({
			message: `Lucid could not load the default database adapter export from "${databaseModule}".`,
		});
	}

	return DatabaseAdapterCtor;
};
