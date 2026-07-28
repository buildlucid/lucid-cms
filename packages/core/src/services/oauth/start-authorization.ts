import constants from "../../constants/constants.js";
import { getValidExternalScopes } from "../../libs/permission/scopes.js";
import { OAuthAuthorizationRequestsRepository } from "../../libs/repositories/index.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import {
	fetchOAuthClientMetadata,
	isLoopbackHostname,
} from "./helpers/client-metadata.js";
import { createOAuthOpaqueToken } from "./helpers/security.js";
import {
	getOAuthAuthorizationErrorUrl,
	getOAuthUrls,
	isSupportedOAuthResource,
} from "./helpers/urls.js";

/** Validates a client request and starts an OAuth authorization flow. */
const startAuthorization: ServiceFn<
	[
		{
			clientId: string;
			redirectUri: string;
			responseType: string;
			resource: string;
			scope: string;
			state: string;
			codeChallenge: string;
			codeChallengeMethod: string;
		},
	],
	{ redirectUrl: string }
> = async (context, input) => {
	const baseUrl = new URL(getBaseUrl(context));
	const metadataRes = await fetchOAuthClientMetadata(input.clientId, {
		allowedLoopbackHostname: isLoopbackHostname(baseUrl.hostname)
			? baseUrl.hostname
			: undefined,
	});
	if (metadataRes.error) return metadataRes;
	const metadata = metadataRes.data;

	if (!metadata.redirect_uris.includes(input.redirectUri)) {
		return {
			error: {
				type: "basic",
				code: "invalid_request",
				status: 400,
			},
			data: undefined,
		};
	}

	if (input.responseType !== "code") {
		return {
			error: undefined,
			data: {
				redirectUrl: getOAuthAuthorizationErrorUrl(
					context,
					input.redirectUri,
					input.state,
					"unsupported_response_type",
				),
			},
		};
	}
	if (
		input.codeChallengeMethod !== "S256" ||
		!/^[A-Za-z0-9_-]{43}$/.test(input.codeChallenge) ||
		!isSupportedOAuthResource(context, input.resource)
	) {
		return {
			error: undefined,
			data: {
				redirectUrl: getOAuthAuthorizationErrorUrl(
					context,
					input.redirectUri,
					input.state,
					"invalid_request",
				),
			},
		};
	}

	const requestedScopes = [...new Set(input.scope.split(" ").filter(Boolean))];
	const validScopes = new Set<string>(getValidExternalScopes(context.config));
	if (
		requestedScopes.length === 0 ||
		requestedScopes.some((scope) => !validScopes.has(scope))
	) {
		return {
			error: undefined,
			data: {
				redirectUrl: getOAuthAuthorizationErrorUrl(
					context,
					input.redirectUri,
					input.state,
					"invalid_scope",
				),
			},
		};
	}

	const requestId = createOAuthOpaqueToken();
	const Requests = new OAuthAuthorizationRequestsRepository(
		context.db.client,
		context.config.db,
	);
	const createRes = await Requests.createSingle({
		data: {
			request_id: requestId,
			client_id: input.clientId,
			client_name: metadata.client_name,
			client_uri: metadata.client_uri ?? null,
			redirect_uri: input.redirectUri,
			resource: input.resource,
			scopes: requestedScopes.join(" "),
			state: input.state,
			code_challenge: input.codeChallenge,
			expires_at: new Date(
				Date.now() +
					constants.oauth.authorizationRequestExpirationSeconds * 1000,
			).toISOString(),
			created_at: new Date().toISOString(),
		},
	});
	if (createRes.error) return createRes;

	return {
		error: undefined,
		data: {
			redirectUrl: `${getOAuthUrls(context).consentPage}/${requestId}`,
		},
	};
};

export default startAuthorization;
