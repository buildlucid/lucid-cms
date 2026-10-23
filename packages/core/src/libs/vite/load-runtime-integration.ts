import { LucidError } from "../../utils/errors/index.js";
import importDefaultExport from "../../utils/helpers/import-default-export.js";
import type { RuntimeAdapter } from "../runtime/types.js";
import type { RuntimeViteIntegration } from "./types.js";

const isRuntimeViteIntegration = (
	value: unknown,
): value is RuntimeViteIntegration =>
	typeof value === "object" &&
	value !== null &&
	"plugins" in value &&
	typeof value.plugins === "function" &&
	(!("loadEnv" in value) ||
		value.loadEnv === undefined ||
		typeof value.loadEnv === "function");

/** Imports the runtime adapter's Vite integration, resolving its module from the project like plugin CLI modules. */
const loadRuntimeIntegration = async (
	adapter: RuntimeAdapter,
	projectRoot: string,
): Promise<RuntimeViteIntegration> => {
	if (!adapter.vite) {
		throw new LucidError({
			message: `The "${adapter.key}" runtime adapter doesn't support Vite.`,
		});
	}

	const integration = await importDefaultExport(adapter.vite, {
		projectRoot,
		label: `The "${adapter.key}" runtime's Vite integration`,
	});
	if (!isRuntimeViteIntegration(integration)) {
		throw new LucidError({
			message: `"${adapter.vite}" must default export the "${adapter.key}" runtime's Vite integration.`,
		});
	}
	return integration;
};

export default loadRuntimeIntegration;
