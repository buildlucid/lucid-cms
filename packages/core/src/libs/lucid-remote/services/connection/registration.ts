import type { ServiceContext } from "../../../../utils/services/types.js";
import {
	type ConnectionRegistration,
	registrationResponseSchema,
} from "../../schema/connection.js";
import type { RemoteResult } from "../../types.js";
import { getLucidConnectionUrls } from "./config.js";
import { requestConnectionJson } from "./request.js";

/** Registers a confidential CMS OAuth client with its exact callback URI. */
export const registerConnectionClient = async (
	context: ServiceContext,
	props: {
		redirectUri: string;
		clientName: string;
		instanceId: string;
	},
): Promise<RemoteResult<ConnectionRegistration>> => {
	const urls = getLucidConnectionUrls(context);
	const request = {
		redirect_uris: [props.redirectUri],
		token_endpoint_auth_method: "client_secret_basic",
		grant_types: ["authorization_code", "refresh_token"],
		response_types: ["code"],
		client_name: props.clientName,
		application_type: "web",
		lucid_cms_instance_id: props.instanceId,
	} as const;

	const result = await requestConnectionJson(
		urls.registrationUrl,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(request),
		},
		registrationResponseSchema,
		"client_registration_invalid",
	);
	if (!result.ok) return result;

	const responseMatchesRequest =
		result.data.redirect_uris.length === 1 &&
		result.data.redirect_uris[0] === request.redirect_uris[0] &&
		result.data.token_endpoint_auth_method ===
			request.token_endpoint_auth_method &&
		result.data.grant_types.length === 2 &&
		result.data.grant_types.includes("authorization_code") &&
		result.data.grant_types.includes("refresh_token") &&
		result.data.response_types.length === 1 &&
		result.data.response_types[0] === "code" &&
		result.data.client_name === request.client_name &&
		result.data.application_type === request.application_type;

	if (!responseMatchesRequest) {
		return {
			ok: false,
			status: 502,
			error: "client_registration_invalid",
			transient: false,
		};
	}

	return {
		ok: true,
		status: result.status,
		data: {
			clientId: result.data.client_id,
			clientSecret: result.data.client_secret,
			clientSecretExpiresAt: result.data.client_secret_expires_at,
			redirectUri: props.redirectUri,
			issuer: urls.issuer,
			resource: urls.resource,
		},
	};
};

/** Builds RFC 7617 Basic credentials from URL-form-encoded client values. */
export const buildClientAuthorization = (
	registration: ConnectionRegistration,
) => {
	const clientId = new URLSearchParams({
		value: registration.clientId,
	})
		.toString()
		.slice("value=".length);
	const clientSecret = new URLSearchParams({
		value: registration.clientSecret,
	})
		.toString()
		.slice("value=".length);

	return `Basic ${Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString(
		"base64",
	)}`;
};
