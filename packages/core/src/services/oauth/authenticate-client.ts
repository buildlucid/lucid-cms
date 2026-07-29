import formatter from "../../libs/formatters/index.js";
import { OAuthClientsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { verifyOAuthClientSecret } from "../oauth-clients/helpers/credentials.js";

const authenticateClient: ServiceFn<
	[
		{
			clientId: string;
			clientSecret?: string;
		},
	],
	{ clientId: string }
> = async (context, input) => {
	const OAuthClients = new OAuthClientsRepository(
		context.db.client,
		context.config.db,
	);

	const clientRes = await OAuthClients.selectSingle({
		select: [
			"token_endpoint_auth_method",
			"client_secret_hash",
			"client_secret_salt",
			"enabled",
		],
		where: [{ key: "client_id", operator: "=", value: input.clientId }],
	});
	if (clientRes.error) return clientRes;

	if (!clientRes.data) {
		if (URL.canParse(input.clientId) && input.clientSecret === undefined) {
			return {
				error: undefined,
				data: {
					clientId: input.clientId,
				},
			};
		}

		return {
			error: {
				type: "authorisation",
				code: "invalid_client",
				status: 401,
			},
			data: undefined,
		};
	}

	if (!formatter.formatBoolean(clientRes.data.enabled)) {
		return {
			error: {
				type: "authorisation",
				code: "invalid_client",
				status: 401,
			},
			data: undefined,
		};
	}

	if (clientRes.data.token_endpoint_auth_method === "none") {
		if (input.clientSecret !== undefined) {
			return {
				error: {
					type: "authorisation",
					code: "invalid_client",
					status: 401,
				},
				data: undefined,
			};
		}

		return {
			error: undefined,
			data: {
				clientId: input.clientId,
			},
		};
	}

	if (
		input.clientSecret === undefined ||
		clientRes.data.client_secret_hash === null ||
		clientRes.data.client_secret_salt === null
	) {
		return {
			error: {
				type: "authorisation",
				code: "invalid_client",
				status: 401,
			},
			data: undefined,
		};
	}

	const verifyRes = await verifyOAuthClientSecret(
		input.clientSecret,
		clientRes.data.client_secret_hash,
		clientRes.data.client_secret_salt,
		context.config.secrets.encryption,
	);
	if (verifyRes.error) return verifyRes;

	return {
		error: undefined,
		data: {
			clientId: input.clientId,
		},
	};
};

export default authenticateClient;
