import type { ResolvedLucidConfig } from "../../../types/config.js";
import getHookKind from "../../hooks/get-hook-kind.js";

/** Checks that each config hook subscribes to an event Lucid or a configured plugin registers. */
const checkHooks = (config: Pick<ResolvedLucidConfig, "hooks" | "plugins">) => {
	for (const hook of config.hooks) {
		const event = String(hook.event);
		if (getHookKind(config, hook.service, event) !== undefined) continue;

		throw new Error(
			`Hook event "${hook.service}.${event}" isn't registered by Lucid or a configured plugin.`,
		);
	}
};

export default checkHooks;
