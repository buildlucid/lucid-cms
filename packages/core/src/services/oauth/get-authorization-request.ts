import { mediaFormatter } from "../../libs/formatters/index.js";
import { getExternalCapability } from "../../libs/permission/capabilities.js";
import type { ExternalScope } from "../../libs/permission/external-scopes.js";
import { getExternalScopeGroups } from "../../libs/permission/scopes.js";
import type { Permission } from "../../libs/permission/types.js";
import { OAuthAuthorizationRequestsRepository } from "../../libs/repositories/index.js";
import type { OAuthAuthorizationRequest } from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Loads the authorization request displayed by the consent screen. */
const getAuthorizationRequest: ServiceFn<
	[
		{
			requestId: string;
			canConnectAsSystem: boolean;
			actor: {
				superAdmin: boolean;
				permissions?: Permission[];
			};
		},
	],
	OAuthAuthorizationRequest
> = async (context, input) => {
	const Requests = new OAuthAuthorizationRequestsRepository(context.db);
	const requestRes = await Requests.selectSingleActiveWithLogo({
		requestId: input.requestId,
		currentTime: new Date().toISOString(),
	});
	if (requestRes.error) return requestRes;
	if (!requestRes.data) {
		return {
			error: {
				type: "basic",
				code: "invalid_request",
				status: 404,
			},
			data: undefined,
		};
	}

	const scopes = requestRes.data.scopes
		.split(" ")
		.filter(Boolean) as ExternalScope[];
	const userScopes = scopes.filter((scope) => {
		const capability = getExternalCapability(context.config, scope, "user");
		if (!capability) return false;
		if (capability.userPermission === null || input.actor.superAdmin)
			return true;
		return (
			input.actor.permissions?.some(
				(permission) => permission === capability.userPermission,
			) === true
		);
	});
	const requestedScopes = new Set<string>(scopes);
	const scopeGroups = getExternalScopeGroups(context.config)
		.map((group) => ({
			...group,
			scopes: group.scopes.filter((scope) => requestedScopes.has(scope.key)),
		}))
		.filter((group) => group.scopes.length > 0);
	const supportsSystemPrincipal = scopes.every(
		(scope) =>
			getExternalCapability(context.config, scope, "system") !== undefined,
	);

	if (scopeGroups.flatMap((group) => group.scopes).length !== scopes.length) {
		return {
			error: {
				type: "basic",
				code: "invalid_scope",
				status: 400,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			requestId: requestRes.data.request_id,
			clientId: requestRes.data.client_id,
			clientName: requestRes.data.client_name,
			clientUri: requestRes.data.client_uri,
			clientLogo: mediaFormatter.formatMediaImagePreview({
				poster: requestRes.data.client_logo[0],
				options: {
					host: getBaseUrl(context),
					delivery: context.mediaDelivery,
					defaultLocale: context.config.localization.defaultLocale,
					locales: context.config.localization.locales,
				},
			}),
			scopes,
			userScopes,
			scopeGroups,
			canConnectAsSystem: input.canConnectAsSystem && supportsSystemPrincipal,
		},
	};
};

export default getAuthorizationRequest;
