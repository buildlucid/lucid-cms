import type { Config } from "../../types/config.js";
import { createTranslator } from "../i18n/index.js";
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
	translate: createTranslator({ config: props.config, locale: "en" }),
});
