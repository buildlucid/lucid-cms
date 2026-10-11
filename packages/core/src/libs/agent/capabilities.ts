import type { AgentCapabilities } from "../../types/response.js";
import hasPermission, {
	type PermissionGrant,
} from "../permission/has-permission.js";
import type {
	AgentToolAvailabilityProps,
	AgentToolDefinition,
} from "../tools/types.js";
import type { AgentDefinition } from "./types.js";

/** Filters available tools by permission, which execution checks again. */
export const getAvailableTools = (
	agent: Pick<AgentDefinition, "tools">,
	grant: PermissionGrant,
	availability: AgentToolAvailabilityProps,
) =>
	agent.tools.filter(
		(tool) =>
			(tool.available?.(availability) ?? true) &&
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
	fileRead: props.tools.flatMap((tool) =>
		tool.capabilities?.fileRead
			? [{ tool: tool.name, mimeTypes: tool.capabilities.fileRead.mimeTypes }]
			: [],
	),
	webSearch: props.tools.flatMap((tool) =>
		tool.capabilities?.webSearch ? [tool.name] : [],
	),
	webRead: props.tools.flatMap((tool) =>
		tool.capabilities?.webRead ? [tool.name] : [],
	),
	imageGeneration: props.tools.flatMap((tool) =>
		tool.capabilities?.imageGeneration ? [tool.name] : [],
	),
});

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
	fileRead: providers.fileRead.length
		? {
				mimeTypes: [
					...new Set(
						providers.fileRead.flatMap((provider) => provider.mimeTypes),
					),
				],
			}
		: null,
	webSearch: providers.webSearch.length > 0,
	webRead: providers.webRead.length > 0,
	imageGeneration: providers.imageGeneration.length > 0,
});
