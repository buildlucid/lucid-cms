import constants from "../../../../constants/constants.js";
import type { ServiceContext } from "../../../../utils/services/types.js";
import {
	authorizationServerMetadataSchema,
	protectedResourceMetadataSchema,
} from "../../schema/connection.js";
import type { RemoteResult } from "../../types.js";
import { getLucidConnectionUrls } from "./config.js";
import { requestConnectionJson } from "./request.js";

const isSecureConnectionUrl = (url: URL) =>
	url.protocol === "https:" ||
	(url.protocol === "http:" &&
		(url.hostname === "localhost" ||
			url.hostname === "127.0.0.1" ||
			url.hostname === "[::1]" ||
			url.hostname === "::1" ||
			url.hostname.startsWith("127.")));

/** Discovers and strictly validates Lucid's OAuth and resource metadata. */
export const discoverConnectionServer = async (
	context: ServiceContext,
): Promise<
	RemoteResult<{
		authorizationEndpoint: string;
	}>
> => {
	const urls = getLucidConnectionUrls(context);
	const [authorizationServer, protectedResource] = await Promise.all([
		requestConnectionJson(
			urls.discoveryUrl,
			{ method: "GET" },
			authorizationServerMetadataSchema,
			"oauth_metadata_invalid",
		),
		requestConnectionJson(
			urls.protectedResourceMetadataUrl,
			{ method: "GET" },
			protectedResourceMetadataSchema,
			"oauth_metadata_invalid",
		),
	]);
	if (!authorizationServer.ok) return authorizationServer;
	if (!protectedResource.ok) return protectedResource;

	let authorizationEndpoint: URL;
	try {
		authorizationEndpoint = new URL(
			authorizationServer.data.authorization_endpoint,
		);
	} catch {
		return {
			ok: false,
			status: 502,
			error: "oauth_metadata_invalid",
			transient: false,
		};
	}

	const authorizationMetadataValid =
		authorizationServer.data.issuer === urls.issuer &&
		isSecureConnectionUrl(authorizationEndpoint) &&
		authorizationEndpoint.username.length === 0 &&
		authorizationEndpoint.password.length === 0 &&
		authorizationEndpoint.pathname === "/oauth/authorize" &&
		authorizationEndpoint.search.length === 0 &&
		authorizationEndpoint.hash.length === 0 &&
		authorizationServer.data.token_endpoint === urls.tokenUrl &&
		authorizationServer.data.registration_endpoint === urls.registrationUrl &&
		authorizationServer.data.revocation_endpoint === urls.revocationUrl &&
		authorizationServer.data.scopes_supported.includes(
			constants.connection.scope,
		) &&
		authorizationServer.data.response_types_supported.includes("code") &&
		authorizationServer.data.grant_types_supported.includes(
			"authorization_code",
		) &&
		authorizationServer.data.grant_types_supported.includes("refresh_token") &&
		authorizationServer.data.token_endpoint_auth_methods_supported.includes(
			"client_secret_basic",
		) &&
		authorizationServer.data.code_challenge_methods_supported.includes(
			"S256",
		) &&
		authorizationServer.data.protected_resources.length === 1 &&
		authorizationServer.data.protected_resources[0] === urls.resource;

	const protectedResourceValid =
		protectedResource.data.resource === urls.resource &&
		protectedResource.data.authorization_servers.length === 1 &&
		protectedResource.data.authorization_servers[0] === urls.issuer &&
		protectedResource.data.scopes_supported.includes(
			constants.connection.scope,
		);

	if (!authorizationMetadataValid || !protectedResourceValid) {
		return {
			ok: false,
			status: 502,
			error: "oauth_metadata_invalid",
			transient: false,
		};
	}

	return {
		ok: true,
		status: 200,
		data: {
			authorizationEndpoint: authorizationEndpoint.toString(),
		},
	};
};
