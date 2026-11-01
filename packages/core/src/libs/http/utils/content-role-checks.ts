import type { ResolvedLucidConfig } from "../../../exports/types.js";
import logger from "../../logger/index.js";
import type { LucidAdapterInstances } from "../../runtime/create-lucid-adapters.js";

/** Warns when local adapters prevent a content deployment from sharing cache updates or uploads. */
const contentRoleChecks = (
	config: ResolvedLucidConfig,
	adapters: Pick<LucidAdapterInstances, "kv" | "mediaStorage">,
) => {
	if (config.role !== "content") return;

	const checked = [
		["KV", adapters.kv],
		["Media storage", adapters.mediaStorage],
	] as const;

	for (const [type, adapter] of checked) {
		if (!adapter?.local) continue;

		logger.warn({
			dedupeKey: `content-role:${type}:${adapter.key}`,
			message: `[${type}] ${adapter.key} keeps data on this machine, so this content role deployment won't see changes from the primary deployment. Use an adapter both deployments can reach.`,
		});
	}
};

export default contentRoleChecks;
