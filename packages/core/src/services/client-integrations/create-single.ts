import T from "../../translations/index.js";
import { ClientIntegrationsRepository } from "../../libs/repositories/index.js";
import generateKeys from "../../utils/client-integrations/generate-keys.js";
import { encodeApiKey } from "../../utils/client-integrations/encode-api-key.js";
import type { ServiceFn } from "../../utils/services/types.js";

const createSingle: ServiceFn<
	[
		{
			name: string;
			description?: string;
			enabled?: boolean;
		},
	],
	{
		apiKey: string;
	}
> = async (context, data) => {
	const ClientIntegrations = new ClientIntegrationsRepository(
		context.db,
		context.config.db,
	);

	const { key, apiKey, apiKeyHash, secret } = await generateKeys(
		context.config.keys.encryptionKey,
	);

	const keyExistsRes = await ClientIntegrations.selectSingle({
		select: ["id"],
		where: [
			{
				key: "key",
				operator: "=",
				value: key,
			},
		],
	});
	if (keyExistsRes.error) return keyExistsRes;

	if (keyExistsRes.data !== undefined) {
		return {
			error: {
				type: "basic",
				message: T("client_integration_key_already_exists"),
				status: 400,
			},
			data: undefined,
		};
	}

	const newIntegrationRes = await ClientIntegrations.createSingle({
		data: {
			name: data.name,
			description: data.description,
			enabled: data.enabled !== undefined ? data.enabled : true,
			key: key,
			secret: secret,
			api_key: apiKeyHash,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		},
		returning: ["id", "api_key"],
		validation: {
			enabled: true,
		},
	});
	if (newIntegrationRes.error) return newIntegrationRes;

	return {
		error: undefined,
		data: {
			apiKey: encodeApiKey(key, apiKey),
		},
	};
};

export default createSingle;
