import type { Config } from "../../types/config.js";
import type { AdapterRuntimeContext } from "../runtime-adapter/types.js";

/**
 * Responsible for checking the compatibility of the plugins with the current runtime context and config.
 *
 * When this throws, its on the CLI commands to handle catching the error and logging the message.
 */
const checkAllPluginsCompatibility = async (props: {
	runtimeContext: AdapterRuntimeContext;
	config: Config;
}) => {
	for (const plugin of props.config.plugins) {
		if (plugin.checkCompatibility) {
			await plugin.checkCompatibility({
				runtimeContext: props.runtimeContext,
				config: props.config,
			});
		}
	}
};

export default checkAllPluginsCompatibility;
