import type { RuntimeAdapterCLILoader } from "@lucidcms/core/types";
import buildCommand from "./cli/build.js";
import serveCommand from "./cli/serve.js";
import type { NodeAdapterOptions } from "./types.js";

const loadCLI: RuntimeAdapterCLILoader = ({ options }) => {
	return {
		serve: serveCommand(options as NodeAdapterOptions | undefined),
		build: buildCommand,
	};
};

export default loadCLI;
export { loadCLI as cli };
