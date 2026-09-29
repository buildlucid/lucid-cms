import type { AgentCapabilities } from "../../types/response.js";
import { Permissions } from "../permission/definitions.js";
import type { Permission } from "../permission/types.js";
import type { AgentToolDefinition } from "../tools/types.js";

/**
 * The tools that provide each capability, from their `capabilities`
 * declarations. Pass tools the principal can already use; media also needs
 * permission to read media.
 */
export const getCapabilityProviders = (props: {
	tools: readonly AgentToolDefinition[];
	can: (permission: Permission) => boolean;
}) => ({
	media: props.can(Permissions.MediaRead)
		? props.tools.flatMap((tool) =>
				tool.capabilities?.media
					? [{ tool: tool.name, mimeTypes: tool.capabilities.media.mimeTypes }]
					: [],
			)
		: [],
	webSearch: props.tools.flatMap((tool) =>
		tool.capabilities?.webSearch ? [tool.name] : [],
	),
	webRead: props.tools.flatMap((tool) =>
		tool.capabilities?.webRead ? [tool.name] : [],
	),
});

/** Combines providers into what the admin shows, without tool names. */
export const summariseCapabilities = (
	providers: ReturnType<typeof getCapabilityProviders>,
): AgentCapabilities => ({
	media: providers.media.length
		? {
				mimeTypes: [
					...new Set(providers.media.flatMap((provider) => provider.mimeTypes)),
				],
			}
		: null,
	webSearch: providers.webSearch.length > 0,
	webRead: providers.webRead.length > 0,
});
