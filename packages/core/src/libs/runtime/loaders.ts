import { LucidError } from "../../utils/errors/index.js";
import type {
	RuntimeConfigureLucid,
	RuntimeConfigureLucidModule,
} from "./types.js";

const moduleCache = new Map<string, Promise<unknown>>();

const dynamicImport = <T>(modulePath: string) =>
	import(/* @vite-ignore */ modulePath) as Promise<T>;

const loadModule = async <T>(modulePath: string): Promise<T> => {
	const cachedModule = moduleCache.get(modulePath);
	if (cachedModule) {
		return cachedModule as Promise<T>;
	}

	const modulePromise = dynamicImport<T>(modulePath);
	moduleCache.set(modulePath, modulePromise);
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
 * Hosted integrations can provide their own wrapper module so Lucid can keep
 * the runtime adapter identity while still applying host-specific config
 * shaping, like Astro's hosted email template handling.
 */
export const getConfigureLucidModule = async (
	modulePath: string,
): Promise<RuntimeConfigureLucid> => {
	const module = await loadModule<
		Partial<RuntimeConfigureLucidModule> & {
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
