import { ClientIntegrationsRepository } from "../../libs/repositories/index.js";
import { encodeApiKey } from "../../utils/client-integrations/encode-api-key.js";
import generateKeys from "../../utils/client-integrations/generate-keys.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkIntegrationAccess from "./checks/check-integration-access.js";

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
		context.db.client,
		context.config.db,
	);

	const checkExistsRes = await checkIntegrationAccess(context, {
		id: data.id,
	});
	if (checkExistsRes.error) return checkExistsRes;

	const { apiKey, apiKeyHash, secret } = await generateKeys(
		context.config.secrets.encryption,
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

	return {
		error: undefined,
		data: {
			apiKey: encodeApiKey(checkExistsRes.data.key, apiKey),
		},
	};
};

export default regenerateKeys;
