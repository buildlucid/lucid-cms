import constants from "../../constants/constants.js";
import { normalizeCopy } from "../i18n/copy.js";
import type { DefineDeployOptions, DeployDefinition } from "./types.js";

/**
 * Defines a deploy that people can run from the admin, and that hook triggers or a schedule can
 * start. Add it to `deploys` in your config.
 * @remarks Triggers queue the deploy and wait out `debounceSeconds`, so a burst of changes starts one run.
 *
 * @example
 * const production = defineDeploy({
 * 	key: "production",
 * 	name: "Production",
 * 	description: "Rebuilds the public site. Changes go live in about two minutes.",
 * 	links: [{ label: "Live site", url: "https://example.com" }],
 * 	provider: deployWebhook({ url: env.BUILD_HOOK_URL }),
 * 	triggers: [
 * 		{
 * 			service: "documents",
 * 			event: "afterChange",
 * 			when: ({ data }) =>
 * 				data.change?.type === "published" && data.change.version === "production",
 * 		},
 * 	],
 * 	schedule: "0 4 * * *",
 * });
 */
const defineDeploy = (options: DefineDeployOptions): DeployDefinition => ({
	type: "deploy-definition",
	key: options.key,
	name: normalizeCopy(options.name),
	description: normalizeCopy(options.description) ?? null,
	links: (options.links ?? []).map((link) => ({
		label: normalizeCopy(link.label),
		url: link.url,
	})),
	provider: options.provider,
	triggers: options.triggers ?? [],
	schedule: options.schedule?.trim().split(/\s+/).join(" ") ?? null,
	debounceSeconds: options.debounceSeconds ?? constants.deploys.debounceSeconds,
	maxWaitSeconds: options.maxWaitSeconds ?? constants.deploys.maxWaitSeconds,
	timeoutSeconds:
		options.timeoutSeconds ??
		options.provider.timeoutSeconds ??
		constants.deploys.timeoutSeconds,
});

export default defineDeploy;
