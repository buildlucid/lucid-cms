import { getExternalCapability } from "../../libs/permission/capabilities.js";
import type { ExternalScope } from "../../libs/permission/external-scopes.js";
import { getExternalScopeGroups } from "../../libs/permission/scopes.js";
import type { Permission } from "../../libs/permission/types.js";
import { OAuthAuthorizationRequestsRepository } from "../../libs/repositories/index.js";
import type { OAuthAuthorizationRequest } from "../../types/response.js";
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
	const Requests = new OAuthAuthorizationRequestsRepository(
		context.db.client,
		context.config.db,
	);
	const requestRes = await Requests.selectSingle({
		select: [
			"request_id",
			"client_id",
			"client_name",
			"client_uri",
			"scopes",
			"expires_at",
		],
		where: [
			{ key: "request_id", operator: "=", value: input.requestId },
			{ key: "consumed_at", operator: "is", value: null },
		],
	});
	if (requestRes.error) return requestRes;
	if (
		!requestRes.data ||
		new Date(requestRes.data.expires_at).getTime() <= Date.now()
	) {
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
		const capability = getExternalCapability(context.config, scope, {
			tenantKey: context.request.tenantKey,
		});
		if (!capability) return false;
		if (capability.userPermission === null || input.actor.superAdmin)
			return true;
		return (
			input.actor.permissions?.includes(capability.userPermission) === true
		);
	});
	const requestedScopes = new Set(scopes);
	const scopeGroups = getExternalScopeGroups(context.config, {
		tenantKey: context.request.tenantKey,
	})
		.map((group) => ({
			...group,
			scopes: group.scopes.filter((scope) => requestedScopes.has(scope.key)),
		}))
		.filter((group) => group.scopes.length > 0);

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
			scopes,
			userScopes,
			scopeGroups,
			canConnectAsSystem: input.canConnectAsSystem,
		},
	};
};

export default getAuthorizationRequest;
