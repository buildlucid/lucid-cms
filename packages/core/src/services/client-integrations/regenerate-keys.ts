import cacheKeys from "../../libs/kv-adapter/cache-keys.js";
import { ClientIntegrationsRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import { encodeApiKey } from "../../utils/client-integrations/encode-api-key.js";
import generateKeys from "../../utils/client-integrations/generate-keys.js";
import type { ServiceFn } from "../../utils/services/types.js";

const regenerateKeys: ServiceFn<
	[
		{
			id: number;
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

	const checkExistsRes = await ClientIntegrations.selectSingle({
		select: ["id", "key"],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				message: T("client_integration_not_found_message"),
				status: 404,
			},
		},
	});
	if (checkExistsRes.error) return checkExistsRes;

	const { apiKey, apiKeyHash, secret } = await generateKeys(
		context.config.keys.encryptionKey,
	);

	const updateKeysRes = await ClientIntegrations.updateSingle({
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
		data: {
			api_key: apiKeyHash,
			secret: secret,
			updated_at: new Date().toISOString(),
		},
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (updateKeysRes.error) return updateKeysRes;

	const cacheKey = cacheKeys.auth.client(checkExistsRes.data.key);
	await context.kv.command.delete(cacheKey);

	return {
		error: undefined,
		data: {
			apiKey: encodeApiKey(checkExistsRes.data.key, apiKey),
		},
	};
};

export default regenerateKeys;
