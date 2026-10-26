import { createLucidHost } from "@lucidcms/core/runtime";
import type {
	EnvironmentVariables,
	HttpExtension,
	LucidBuild,
} from "@lucidcms/core/types";
import type { CloudflareExecutionContext } from "../types.js";
import durableObjectAgentRunner from "./durable-object-agent-runner.js";
import getRuntimeContext from "./get-runtime-context.js";
import getOrCreateRuntimeHost from "./runtime-host.js";

/** Creates the getter for a built project's cached Lucid hosts, which the Worker's handlers and its Durable Objects share. */
const createHostGetter = (build: LucidBuild) => {
	const runtimeContext = getRuntimeContext({
		compiled: build.dev === undefined,
		pluginModules: build.pluginModules,
	});

	return (
		key: string,
		env: EnvironmentVariables,
		ctx: CloudflareExecutionContext,
		extensions?: HttpExtension[],
	) =>
		getOrCreateRuntimeHost(
			key,
			() =>
				createLucidHost({
					...build.host,
					env,
					runtimeContext,
					databaseScope: "invocation",
					adapterDefaults: { agentRunner: durableObjectAgentRunner },
					http: extensions ? { extensions } : undefined,
				}),
			(promise) => ctx.waitUntil(promise),
		);
};

export default createHostGetter;
