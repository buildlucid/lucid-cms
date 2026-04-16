import type { RuntimeAdapterCLILoader } from "@lucidcms/core/types";
import type { PlatformProxy } from "wrangler";
import buildCommand from "./cli/build.js";
import serveCommand from "./cli/serve.js";
import type { AdapterOptions } from "./types.js";

const loadCLI: RuntimeAdapterCLILoader = ({ options, envResult }) => {
	const platformProxy = (envResult?.state as { platformProxy?: PlatformProxy })
		?.platformProxy;

	return {
		serve: serveCommand(options as AdapterOptions | undefined, platformProxy),
		build: buildCommand,
	};
};

export default loadCLI;
export { loadCLI as cli };
