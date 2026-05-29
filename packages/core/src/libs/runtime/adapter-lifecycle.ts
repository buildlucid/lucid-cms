import type { Config } from "../../types/config.js";
import type {
	AdapterLifecycleContext,
	AdapterRuntimeContext,
	EnvironmentVariables,
} from "./types.js";

export const createAdapterLifecycleContext = (props: {
	config: Config;
	env?: EnvironmentVariables;
	runtimeContext?: AdapterRuntimeContext;
}): AdapterLifecycleContext => ({
	config: props.config,
	env: props.env,
	runtimeContext: props.runtimeContext,
});
