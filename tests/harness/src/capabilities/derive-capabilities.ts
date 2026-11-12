import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import { PROVIDERS } from "../../../shared/config/fragments/auth.ts";
import { OUTBOX_ADAPTER_KEY } from "../fakes/outbox.ts";
import getConfiguredQueue from "../utils/get-configured-queue.ts";
import type { Capability } from "./types.ts";

/** Lists the names whose flag is on, as capabilities with the given prefix. */
const enabled = <Prefix extends string>(
	prefix: Prefix,
	flags: Record<string, boolean>,
) =>
	Object.entries(flags)
		.filter(([, on]) => on)
		.map(([name]) => `${prefix}${name}` as const);

/** The queue adapter's key, and whether it can hold jobs until a later time. */
const queueCapabilities = (config: ResolvedLucidConfig): Capability[] => {
	const queue = getConfiguredQueue(config);
	if (!queue) {
		return [];
	}
	return [
		`queue:${queue.key}`,
		...enabled("queue.", { delayedDelivery: queue.support.delayedDelivery }),
	];
};

/** Reads what a setup can do from its resolved config. */
const deriveCapabilities = (config: ResolvedLucidConfig): Capability[] => [
	`database:${config.db.adapter}`,
	...queueCapabilities(config),
	...enabled("database.", config.db.config.support),
	//* official plugins are keyed by package name, so `@lucidcms/pages` reads as `plugin:pages`
	...config.plugins.map(
		(plugin) => `plugin:${plugin.key.replace(/^@lucidcms\//, "")}` as const,
	),
	...config.collections.map(
		(collection) => `collection:${collection.key}` as const,
	),
	...config.ai.agents
		.filter((agent) => agent.enabled)
		.map((agent) => `agent:${agent.key}` as const),
	...config.localization.locales.map(
		(locale) => `locale:${locale.code}` as const,
	),
	...enabled("auth:", {
		password: config.auth.password.enabled,
		magicLink: config.auth.magicLink.enabled,
		twoFactor: config.auth.twoFactor.enabled,
		passkeys: config.auth.passkeys.enabled,
	}),
	...enabled("feature:", {
		ai: config.ai.enabled,
		mcp: config.ai.mcp.enabled,
		openAPI: config.http.openAPI.enabled,
		localization: config.localization.locales.length > 0,
		mediaStorage: config.media.storageAdapter !== undefined,
	}),
	...enabled("harness:", {
		outbox:
			typeof config.email.adapter === "object" &&
			"key" in config.email.adapter &&
			config.email.adapter.key === OUTBOX_ADAPTER_KEY,
		identityProvider: Object.values(PROVIDERS).every((key) =>
			config.auth.providers.some(
				(provider) => provider.key === key && provider.enabled,
			),
		),
	}),
];

export default deriveCapabilities;
