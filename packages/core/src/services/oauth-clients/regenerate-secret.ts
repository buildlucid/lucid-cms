import { OAuthClientsRepository } from "../../libs/repositories/index.js";
import type { OAuthClientRegenerateSecretResponse } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { createOAuthClientSecret } from "./helpers/credentials.js";

const regenerateSecret: ServiceFn<
	[{ id: number }],
	OAuthClientRegenerateSecretResponse
> = async (context, data) => {
	const OAuthClients = new OAuthClientsRepository(context.db);

	const existingRes = await OAuthClients.selectSingle({
		select: ["token_endpoint_auth_method"],
		where: [{ key: "id", operator: "=", value: data.id }],
		validation: {
			enabled: true,
			defaultError: {
				status: 404,
			},
		},
	});
	if (existingRes.error) return existingRes;

	if (existingRes.data.token_endpoint_auth_method !== "client_secret_basic") {
		return {
			error: {
				type: "basic",
				code: "invalid_request",
				status: 400,
			},
			data: undefined,
		};
	}

	const credential = createOAuthClientSecret(context.config.secrets.encryption);
	const updateRes = await OAuthClients.updateSingle({
		data: {
			client_secret_hash: credential.clientSecretHash,
			client_secret_salt: credential.clientSecretSalt,
			updated_at: new Date().toISOString(),
		},
		where: [{ key: "id", operator: "=", value: data.id }],
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (updateRes.error) return updateRes;

	return {
		error: undefined,
		data: {
			clientSecret: credential.clientSecret,
		},
	};
};

export default regenerateSecret;
