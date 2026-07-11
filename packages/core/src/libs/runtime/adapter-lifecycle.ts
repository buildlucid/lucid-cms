import type { Config } from "../../types/config.js";
import type {
	AdapterLifecycleContext,
	AdapterLifecyclePurpose,
	AdapterRuntimeContext,
	EnvironmentVariables,
} from "./types.js";

export const createAdapterLifecycleContext = (props: {
	config: Config;
	env?: EnvironmentVariables;
	runtimeContext?: AdapterRuntimeContext;
	purpose?: AdapterLifecyclePurpose;
}): AdapterLifecycleContext => ({
	config: props.config,
	env: props.env,
	runtimeContext: props.runtimeContext,
	purpose: props.purpose ?? "runtime",
});
