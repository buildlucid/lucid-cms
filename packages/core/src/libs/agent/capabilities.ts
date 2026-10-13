import type {
	AgentCapabilities,
	MediaGenerationType,
} from "../../types/response.js";
import hasPermission, {
	type PermissionGrant,
} from "../permission/has-permission.js";
import type {
	AgentToolAvailabilityProps,
	AgentToolCapabilities,
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
}) => {
	const named = (
		provides: (capabilities: AgentToolCapabilities) => boolean | undefined,
	) =>
		props.tools.flatMap((tool) =>
			tool.capabilities && provides(tool.capabilities) ? [tool.name] : [],
		);
	const withMimeTypes = (
		provides: (
			capabilities: AgentToolCapabilities,
		) => { mimeTypes: readonly string[] } | undefined,
	) =>
		props.tools.flatMap((tool) => {
			const capability = tool.capabilities && provides(tool.capabilities);
			return capability
				? [{ tool: tool.name, mimeTypes: capability.mimeTypes }]
				: [];
		});

	return {
		media: {
			analyze: withMimeTypes((capabilities) => capabilities.media?.analyze),
			readFile: withMimeTypes((capabilities) => capabilities.media?.readFile),
			generate: {
				image: named((capabilities) => capabilities.media?.generate?.image),
				audio: named((capabilities) => capabilities.media?.generate?.audio),
			} satisfies Record<MediaGenerationType, string[]>,
		},
		web: {
			search: named((capabilities) => capabilities.web?.search),
			read: named((capabilities) => capabilities.web?.read),
		},
	};
};

const mimeTypes = (
	providers: readonly { mimeTypes: readonly string[] }[],
): { mimeTypes: string[] } | null =>
	providers.length
		? {
				mimeTypes: [
					...new Set(providers.flatMap((provider) => provider.mimeTypes)),
				],
			}
		: null;

/** What the agent can do, as the API reports it. */
export const summariseCapabilities = (
	providers: ReturnType<typeof getCapabilityProviders>,
): AgentCapabilities => ({
	media: {
		analyze: mimeTypes(providers.media.analyze),
		readFile: mimeTypes(providers.media.readFile),
		generate: {
			image: providers.media.generate.image.length > 0,
			audio: providers.media.generate.audio.length > 0,
		},
	},
	web: {
		search: providers.web.search.length > 0,
		read: providers.web.read.length > 0,
	},
});
