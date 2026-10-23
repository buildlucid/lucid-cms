import { LucidError } from "../../utils/errors/index.js";
import importDefaultExport from "../../utils/helpers/import-default-export.js";
import type { HostAdapter } from "../runtime/types.js";
import type { HostCliIntegration } from "./types.js";

const isHostCliIntegration = (value: unknown): value is HostCliIntegration =>
	typeof value === "object" &&
	value !== null &&
	"name" in value &&
	typeof value.name === "string" &&
	"commands" in value &&
	typeof value.commands === "object" &&
	value.commands !== null &&
	"viteConfig" in value &&
	typeof value.viteConfig === "function";

/** Imports the declared host's CLI integration, resolving its module from the project like the runtime's Vite integration. */
const loadHostCli = async (
	host: HostAdapter,
	projectRoot: string,
): Promise<HostCliIntegration> => {
	const integration = await importDefaultExport(host.cli, {
		projectRoot,
		label: `The "${host.key}" host's CLI integration`,
	});
	if (!isHostCliIntegration(integration)) {
		throw new LucidError({
			message: `"${host.cli}" must default export the "${host.key}" host's CLI integration.`,
		});
	}

	return integration;
};

export default loadHostCli;
