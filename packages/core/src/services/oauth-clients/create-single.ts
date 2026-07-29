import type { OAuthClientAuthMethod } from "../../libs/db/types.js";
import {
	OAuthClientRedirectUrisRepository,
	OAuthClientsRepository,
} from "../../libs/repositories/index.js";
import type { OAuthClientLogoInput } from "../../schemas/oauth-clients.js";
import type { OAuthClientCreateResponse } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { isSafeRedirectUri } from "../oauth/helpers/client-metadata.js";
import getSingle from "./get-single.js";
import {
	createOAuthClientId,
	createOAuthClientSecret,
} from "./helpers/credentials.js";
import { createOAuthClientLogo } from "./helpers/logo.js";

const createSingle: ServiceFn<
	[
		{
			name: string;
			clientUri?: string;
			authMethod: OAuthClientAuthMethod;
			redirectUris: string[];
			enabled?: boolean;
			logo?: OAuthClientLogoInput;
			userId: number;
		},
	],
	OAuthClientCreateResponse
> = async (context, data) => {
	const redirectUris = [...new Set(data.redirectUris)];
	if (!redirectUris.every(isSafeRedirectUri)) {
		return {
			error: {
				type: "validation",
				status: 400,
				errors: {
					redirectUris: {
						code: "invalid_request",
					},
				},
			},
			data: undefined,
		};
	}

	const OAuthClients = new OAuthClientsRepository(
		context.db.client,
		context.config.db,
	);
	const RedirectUris = new OAuthClientRedirectUrisRepository(
		context.db.client,
		context.config.db,
	);
	const clientId = createOAuthClientId();
	const credential =
		data.authMethod === "client_secret_basic"
			? createOAuthClientSecret(context.config.secrets.encryption)
			: undefined;

	let logoMediaId: number | undefined;
	if (data.logo) {
		const logoRes = await createOAuthClientLogo(
			context,
			data.logo,
			data.userId,
		);
		if (logoRes.error) return logoRes;
		logoMediaId = logoRes.data;
	}

	const now = new Date().toISOString();
	const createRes = await OAuthClients.createSingle({
		data: {
			client_id: clientId,
			name: data.name,
			client_uri: data.clientUri,
			token_endpoint_auth_method: data.authMethod,
			client_secret_hash: credential?.clientSecretHash,
			client_secret_salt: credential?.clientSecretSalt,
			logo_media_id: logoMediaId,
			enabled: data.enabled ?? true,
			created_by: data.userId,
			created_at: now,
			updated_at: now,
		},
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (createRes.error) return createRes;

	const redirectRes = await RedirectUris.createMultiple({
		data: redirectUris.map((redirectUri) => ({
			oauth_client_id: createRes.data.id,
			redirect_uri: redirectUri,
			created_at: now,
		})),
	});
	if (redirectRes.error) return redirectRes;

	const clientRes = await getSingle(context, { id: createRes.data.id });
	if (clientRes.error) return clientRes;

	return {
		error: undefined,
		data: {
			client: clientRes.data,
			clientSecret: credential?.clientSecret ?? null,
		},
	};
};

export default createSingle;
