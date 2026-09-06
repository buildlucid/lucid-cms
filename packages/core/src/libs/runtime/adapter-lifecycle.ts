import type { ResolvedLucidConfig } from "../../types/config.js";
import type {
	AdapterLifecycleContext,
	AdapterRuntimeContext,
	EnvironmentVariables,
} from "./types.js";

export const createAdapterLifecycleContext = (props: {
	config: ResolvedLucidConfig;
	env?: EnvironmentVariables;
	runtimeContext?: AdapterRuntimeContext;
}): AdapterLifecycleContext => ({
	config: props.config,
	env: props.env,
	runtimeContext: props.runtimeContext,
});
