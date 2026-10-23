import type { RuntimeAdapter } from "../runtime/types.js";
import loadRuntimeIntegration from "./load-runtime-integration.js";
import resolveEnvMode from "./resolve-env-mode.js";

/** Creates a Node config env loader using the integration's `loadEnv` with `resolveEnvMode(mode)`, yielding undefined when absent so the adapter's loader applies. */
const loadIntegrationEnv =
	(projectRoot: string, mode?: string) => async (adapter: RuntimeAdapter) => {
		const integration = await loadRuntimeIntegration(adapter, projectRoot);
		return integration.loadEnv?.({
			adapter,
			projectRoot,
			mode: resolveEnvMode(mode),
		});
	};

export default loadIntegrationEnv;
