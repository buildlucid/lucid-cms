import type { AgentCapabilities } from "../../types/response.js";
import hasPermission, {
	type PermissionGrant,
} from "../permission/has-permission.js";
import type { AgentToolDefinition } from "../tools/types.js";
import type { AgentDefinition } from "./types.js";

/** The agent's tools the principal holds every permission for. Execution checks permissions again. */
export const getAvailableTools = (
	agent: Pick<AgentDefinition, "tools">,
	grant: PermissionGrant,
) =>
	agent.tools.filter((tool) =>
		tool.permissions.every((permission) => hasPermission(grant, permission)),
	);

/**
 * The tools that provide each capability, from their `capabilities`
 * declarations. Pass tools the principal can already use. Resource access is checked when a tool runs.
 */
export const getCapabilityProviders = (props: {
	tools: readonly AgentToolDefinition[];
}) => ({
	mediaAnalysis: props.tools.flatMap((tool) =>
		tool.capabilities?.mediaAnalysis
			? [
					{
						tool: tool.name,
						mimeTypes: tool.capabilities.mediaAnalysis.mimeTypes,
					},
				]
			: [],
	),
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
	mediaAnalysis: providers.mediaAnalysis.length
		? {
				mimeTypes: [
					...new Set(
						providers.mediaAnalysis.flatMap((provider) => provider.mimeTypes),
					),
				],
			}
		: null,
	webSearch: providers.webSearch.length > 0,
	webRead: providers.webRead.length > 0,
});
