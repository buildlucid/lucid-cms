import T from "../../translations/index.js";
import { scrypt } from "@noble/hashes/scrypt.js";
import { ClientIntegrationsRepository } from "../../libs/repositories/index.js";
import formatter from "../../libs/formatters/index.js";
import { decrypt } from "../../utils/helpers/encrypt-decrypt.js";
import constants from "../../constants/constants.js";
import { decodeApiKey } from "../../utils/client-integrations/encode-api-key.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { LucidClientIntegrationAuth } from "../../types/hono.js";

const verifyApiKey: ServiceFn<
	[
		{
			apiKey: string;
		},
	],
	LucidClientIntegrationAuth
> = async (context, data) => {
	const ClientIntegrations = new ClientIntegrationsRepository(
		context.db,
		context.config.db,
	);

	const { key: decodedKey, apiKey: decodedApiKey } = decodeApiKey(data.apiKey);
	if (!decodedApiKey) {
		return {
			error: {
				message: T("client_integration_api_key_missing"),
			},
			data: undefined,
		};
	}
	if (!decodedKey) {
		return {
			error: {
				message: T("client_integration_key_missing"),
			},
			data: undefined,
		};
	}

	const clientIntegrationRes = await ClientIntegrations.selectSingle({
		where: [
			{
				key: "key",
				operator: "=",
				value: decodedKey,
			},
		],
		select: ["id", "api_key", "secret", "enabled", "key"],
		validation: {
			enabled: true,
			defaultError: {
				message: T("cannot_find_client_integration"),
			},
		},
	});
	if (clientIntegrationRes.error) return clientIntegrationRes;

	if (!formatter.formatBoolean(clientIntegrationRes.data.enabled)) {
		return {
			error: {
				message: T("client_integration_is_disabled"),
			},
			data: undefined,
		};
	}

	const secret = decrypt(
		clientIntegrationRes.data.secret,
		context.config.keys.encryptionKey,
	);

	const inputApiKeyHash = Buffer.from(
		scrypt(decodedApiKey, secret, constants.scrypt),
	).toString("base64");

	const verifyApiKey = inputApiKeyHash === clientIntegrationRes.data.api_key;

	if (verifyApiKey === false) {
		return {
			error: {
				message: T("invalid_client_integration_api_key"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			id: clientIntegrationRes.data.id,
			key: clientIntegrationRes.data.key,
		},
	};
};

export default verifyApiKey;
