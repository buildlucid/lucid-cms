import type { ResolvedLucidConfig } from "../../types/config.js";
import { hookExecutionKinds } from "./hook-map.js";
import type { HookExecutionKind } from "./types.js";

const coreHookKinds: Readonly<
	Record<string, Readonly<Record<string, HookExecutionKind>>>
> = hookExecutionKinds;

/** Returns a core or configured plugin event's execution kind, or undefined if unregistered. */
const getHookKind = (
	config: Pick<ResolvedLucidConfig, "plugins">,
	service: string,
	event: string,
): HookExecutionKind | undefined => {
	const events = Object.hasOwn(coreHookKinds, service)
		? coreHookKinds[service]
		: config.plugins.find((plugin) => plugin.hookEvents?.key === service)
				?.hookEvents?.events;
	if (!events || !Object.hasOwn(events, event)) return undefined;

	return events[event];
};

export default getHookKind;
