import path from "node:path";
import { pathToFileURL } from "node:url";
import { HostAdapterSchema } from "../runtime/schema.js";
import loadConfigModule from "./utils/load-config-module.js";
import withConfigLoader from "./utils/with-config-loader.js";

/** Reads the host `lucid.config.*` declares without resolving the config, for commands that start differently under a host. */
const readConfigHost = (configPath: string) =>
	withConfigLoader(async (loader) => {
		const { module } = await loadConfigModule<{ default?: unknown }>({
			loader,
			specifier: pathToFileURL(configPath).href,
		});
		const definition = module.default;
		// An invalid host is left for the config's own loading to report.
		return typeof definition === "object" &&
			definition !== null &&
			"host" in definition
			? HostAdapterSchema.safeParse(definition.host).data
			: undefined;
	}, path.dirname(configPath));

export default readConfigHost;
