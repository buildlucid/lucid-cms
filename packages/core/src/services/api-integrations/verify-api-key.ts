import { timingSafeEqual } from "node:crypto";
import { scrypt } from "@noble/hashes/scrypt.js";
import constants from "../../constants/constants.js";
import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import type { ExternalScope } from "../../libs/permission/external-scopes.js";
import { ApiIntegrationsRepository } from "../../libs/repositories/index.js";
import type { LucidApiKeyExternalAuth } from "../../types/hono.js";
import { decodeApiKey } from "../../utils/api-integrations/encode-api-key.js";
import { decrypt } from "../../utils/helpers/encrypt-decrypt.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Verifies an API key and resolves its external request authority. */
const verifyApiKey: ServiceFn<
	[
		{
			apiKey: string;
		},
	],
	LucidApiKeyExternalAuth
> = async (context, data) => {
	const ApiIntegrations = new ApiIntegrationsRepository(
		context.db.client,
		context.config.db,
	);

	const { key: decodedKey, apiKey: decodedApiKey } = decodeApiKey(data.apiKey);
	if (!decodedApiKey) {
		return {
			error: {
				message: copy("server:core.client.integrations.api.key.missing"),
			},
			data: undefined,
		};
	}
	if (!decodedKey) {
		return {
			error: {
				message: copy("server:core.client.integrations.key.missing"),
			},
			data: undefined,
		};
	}

	const apiIntegrationRes = await ApiIntegrations.selectSingleByKeyWithScopes({
		key: decodedKey,
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.client.integrations.not.found"),
			},
		},
	});
	if (apiIntegrationRes.error) return apiIntegrationRes;

	if (!formatter.formatBoolean(apiIntegrationRes.data.enabled)) {
		return {
			error: {
				message: copy("server:core.client.integrations.disabled"),
			},
			data: undefined,
		};
	}

	const secret = decrypt(
		apiIntegrationRes.data.secret,
		context.config.secrets.encryption,
	);

	const inputApiKeyHash = Buffer.from(
		scrypt(decodedApiKey, secret, constants.scrypt),
	).toString("base64");

	const inputHashBuffer = Buffer.from(inputApiKeyHash, "utf8");
	const storedHashBuffer = Buffer.from(apiIntegrationRes.data.api_key, "utf8");
	const verifyApiKey =
		inputHashBuffer.length === storedHashBuffer.length &&
		timingSafeEqual(inputHashBuffer, storedHashBuffer);

	if (verifyApiKey === false) {
		return {
			error: {
				message: copy("server:core.client.integrations.api.key.invalid"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			credential: {
				type: "api-key",
				integrationId: apiIntegrationRes.data.id,
			},
			principal: {
				type: "system",
			},
			scopes: (apiIntegrationRes.data.scopes || []).map(
				(scope) => scope.scope as ExternalScope,
			),
			tenantKey: apiIntegrationRes.data.tenant_key ?? null,
		},
	};
};

export default verifyApiKey;
