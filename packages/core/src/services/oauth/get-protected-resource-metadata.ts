import { ExternalScopes } from "../../libs/permission/external-scopes.js";
import { getValidExternalScopes } from "../../libs/permission/scopes.js";
import { getMcpToolRegistry } from "../../libs/tools/registry.js";
import type { OAuthProtectedResourceMetadataResponse } from "../../schemas/oauth.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { getOAuthUrls, type OAuthResource } from "./helpers/urls.js";

/** Builds the OAuth protected-resource metadata document. */
const getProtectedResourceMetadata: ServiceFn<
	[{ resource: OAuthResource }],
	OAuthProtectedResourceMetadataResponse
> = async (context, input) => {
	if (
		input.resource === "mcp" &&
		!(context.config.ai.enabled && context.config.ai.mcp.enabled)
	) {
		return {
			error: { type: "basic", status: 404 },
			data: undefined,
		};
	}

	const urls = getOAuthUrls(context);
	const validScopes = getValidExternalScopes(context.config);
	const mcpScopes =
		input.resource === "mcp"
			? new Set<string>([
					ExternalScopes.McpAccess,
					...[...getMcpToolRegistry(context.config).values()].flatMap(
						(tool) => [
							...tool.scopes,
							...(tool.advertisedScopes?.(context.config) ?? []),
						],
					),
				])
			: undefined;

	return {
		error: undefined,
		data: {
			resource: urls.resources[input.resource].resource,
			authorization_servers: [urls.issuer],
			bearer_methods_supported: ["header"],
			scopes_supported: mcpScopes
				? validScopes.filter((scope) => mcpScopes.has(scope))
				: validScopes,
		},
	};
};

export default getProtectedResourceMetadata;
