import { createLucidHost } from "@lucidcms/core/runtime";
import type {
	EnvironmentVariables,
	HttpExtension,
	LucidBuild,
} from "@lucidcms/core/types";
import type { CloudflareExecutionContext } from "../types.js";
import type { HostCache } from "./create-host-cache.js";
import durableObjectAgentRunner from "./durable-object-agent-runner.js";
import getRuntimeContext from "./get-runtime-context.js";

/** Creates the getter for a built project's Lucid hosts in `cache`, which the Worker's handlers and its Durable Objects share. */
const createHostGetter = (build: LucidBuild, cache: HostCache) => {
	const runtimeContext = getRuntimeContext({
		compiled: build.dev === undefined,
		host: build.host.meta.host,
		pluginModules: build.pluginModules,
	});

	return (
		key: string,
		env: EnvironmentVariables,
		/** Keeps the host's start-up alive, when the Worker event has one, such as outside a prerender. */
		ctx: CloudflareExecutionContext | undefined,
		extensions?: HttpExtension[],
	) =>
		cache.get(
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
			ctx && ((promise) => ctx.waitUntil(promise)),
		);
};

export default createHostGetter;
