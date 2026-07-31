import constants from "../../constants/constants.js";
import collections from "../../libs/collection/collections.js";
import type { OAuthPrincipalType } from "../../libs/db/types.js";
import { getExternalCapability } from "../../libs/permission/capabilities.js";
import { getValidExternalScopes } from "../../libs/permission/scopes.js";
import type { Permission } from "../../libs/permission/types.js";
import {
	OAuthAuthorizationCodesRepository,
	OAuthAuthorizationRequestsRepository,
	OAuthGrantScopesRepository,
	OAuthGrantsRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import {
	createOAuthOpaqueToken,
	hashOAuthAuthorizationCode,
} from "./helpers/security.js";
import { getOAuthUrls } from "./helpers/urls.js";

/** Completes a consent decision and issues an authorization code. */
const completeAuthorization: ServiceFn<
	[
		{
			requestId: string;
			decision: "allow" | "deny";
			principalType?: OAuthPrincipalType;
			actor: {
				userId: number;
				canConnectAsSystem: boolean;
				superAdmin: boolean;
				permissions?: Permission[];
			};
		},
	],
	{ redirectUrl: string }
> = async (context, input) => {
	const collectionsRes = await collections.getAll(context, {});
	if (collectionsRes.error) return collectionsRes;

	if (
		input.decision === "allow" &&
		(!input.principalType ||
			(input.principalType === "system" && !input.actor.canConnectAsSystem))
	) {
		return {
			error: {
				type: "authorisation",
				code: "access_denied",
				status: 403,
			},
			data: undefined,
		};
	}

	const now = new Date().toISOString();
	const Requests = new OAuthAuthorizationRequestsRepository(
		context.db.client,
		context.config.db,
	);
	const requestRes = await Requests.consume({
		requestId: input.requestId,
		consumedAt: now,
	});
	if (requestRes.error) return requestRes;
	if (!requestRes.data) {
		return {
			error: {
				type: "basic",
				code: "invalid_request",
				status: 400,
			},
			data: undefined,
		};
	}

	const redirect = new URL(requestRes.data.redirect_uri);
	redirect.searchParams.set("state", requestRes.data.state);
	redirect.searchParams.set("iss", getOAuthUrls(context).issuer);

	if (input.decision === "deny") {
		redirect.searchParams.set("error", "access_denied");
		return {
			error: undefined,
			data: { redirectUrl: redirect.toString() },
		};
	}

	if (!input.principalType) {
		return { error: { type: "basic", status: 400 }, data: undefined };
	}

	const requestedScopes = requestRes.data.scopes.split(" ").filter(Boolean);
	const validScopes = new Set<string>(
		getValidExternalScopes(collectionsRes.data, {
			principalType: input.principalType,
		}),
	);
	if (requestedScopes.some((scope) => !validScopes.has(scope))) {
		return {
			error: {
				type: "basic",
				code: "invalid_scope",
				status: 400,
			},
			data: undefined,
		};
	}
	const scopes =
		input.principalType === "system"
			? requestedScopes
			: requestedScopes.filter((scope) => {
					const capability = getExternalCapability(
						collectionsRes.data,
						scope,
						"user",
					);
					if (!capability) return false;
					if (capability.userPermission === null || input.actor.superAdmin) {
						return true;
					}
					return (
						input.actor.permissions?.includes(capability.userPermission) ===
						true
					);
				});
	if (scopes.length === 0) {
		return {
			error: {
				type: "authorisation",
				code: "access_denied",
				status: 403,
			},
			data: undefined,
		};
	}

	const Grants = new OAuthGrantsRepository(
		context.db.client,
		context.config.db,
	);
	const grantRes = await Grants.createSingle({
		data: {
			name: requestRes.data.client_name,
			client_id: requestRes.data.client_id,
			client_name: requestRes.data.client_name,
			client_uri: requestRes.data.client_uri,
			principal_type: input.principalType,
			user_id: input.principalType === "user" ? input.actor.userId : null,
			created_by: input.actor.userId,
			created_at: now,
			updated_at: now,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	if (grantRes.error) return grantRes;

	const GrantScopes = new OAuthGrantScopesRepository(
		context.db.client,
		context.config.db,
	);
	const scopeRes = await GrantScopes.createMultiple({
		data: scopes.map((scope) => ({
			grant_id: grantRes.data.id,
			scope,
			created_at: now,
		})),
	});
	if (scopeRes.error) return scopeRes;

	const code = createOAuthOpaqueToken();
	const Codes = new OAuthAuthorizationCodesRepository(
		context.db.client,
		context.config.db,
	);
	const codeRes = await Codes.createSingle({
		data: {
			code_hash: hashOAuthAuthorizationCode(context, code),
			grant_id: grantRes.data.id,
			client_id: requestRes.data.client_id,
			redirect_uri: requestRes.data.redirect_uri,
			resource: requestRes.data.resource,
			code_challenge: requestRes.data.code_challenge,
			expires_at: new Date(
				Date.now() + constants.oauth.authorizationCodeExpirationSeconds * 1000,
			).toISOString(),
			created_at: now,
		},
	});
	if (codeRes.error) return codeRes;

	redirect.searchParams.set("code", code);
	return {
		error: undefined,
		data: { redirectUrl: redirect.toString() },
	};
};

export default completeAuthorization;
