import { timingSafeEqual } from "node:crypto";
import { scrypt } from "@noble/hashes/scrypt.js";
import constants from "../../constants/constants.js";
import formatter from "../../libs/formatters/index.js";
import { serverText } from "../../libs/i18n/index.js";
import { ClientIntegrationsRepository } from "../../libs/repositories/index.js";
import type { LucidClientIntegrationAuth } from "../../types/hono.js";
import { decodeApiKey } from "../../utils/client-integrations/encode-api-key.js";
import { decrypt } from "../../utils/helpers/encrypt-decrypt.js";
import type { ServiceFn } from "../../utils/services/types.js";

const verifyApiKey: ServiceFn<
	[
		{
			apiKey: string;
		},
	],
	LucidClientIntegrationAuth
> = async (context, data) => {
	const ClientIntegrations = new ClientIntegrationsRepository(
		context.db.client,
		context.config.db,
	);

	const { key: decodedKey, apiKey: decodedApiKey } = decodeApiKey(data.apiKey);
	if (!decodedApiKey) {
		return {
			error: {
				message: serverText("core.client.integrations.api.key.missing"),
			},
			data: undefined,
		};
	}
	if (!decodedKey) {
		return {
			error: {
				message: serverText("core.client.integrations.key.missing"),
			},
			data: undefined,
		};
	}

	const clientIntegrationRes =
		await ClientIntegrations.selectSingleByKeyWithScopes({
			key: decodedKey,
			validation: {
				enabled: true,
				defaultError: {
					message: serverText("core.client.integrations.not.found"),
				},
			},
		});
	if (clientIntegrationRes.error) return clientIntegrationRes;

	if (!formatter.formatBoolean(clientIntegrationRes.data.enabled)) {
		return {
			error: {
				message: serverText("core.client.integrations.disabled"),
			},
			data: undefined,
		};
	}

	const secret = decrypt(
		clientIntegrationRes.data.secret,
		context.config.secrets.encryption,
	);

	const inputApiKeyHash = Buffer.from(
		scrypt(decodedApiKey, secret, constants.scrypt),
	).toString("base64");

	const inputHashBuffer = Buffer.from(inputApiKeyHash, "utf8");
	const storedHashBuffer = Buffer.from(
		clientIntegrationRes.data.api_key,
		"utf8",
	);
	const verifyApiKey =
		inputHashBuffer.length === storedHashBuffer.length &&
		timingSafeEqual(inputHashBuffer, storedHashBuffer);

	if (verifyApiKey === false) {
		return {
			error: {
				message: serverText("core.client.integrations.api.key.invalid"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			id: clientIntegrationRes.data.id,
			key: clientIntegrationRes.data.key,
			scopes: (clientIntegrationRes.data.scopes || []).map((s) => s.scope),
		},
	};
};

export default verifyApiKey;
