import { IntegrationsRepository } from "../../libs/repositories/index.js";
import { encodeApiKey } from "../../utils/integrations/encode-api-key.js";
import generateKeys from "../../utils/integrations/generate-keys.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkIntegrationAccess from "./checks/check-integration-access.js";

/** Rotates an integration credential and returns it once. */
const regenerateKeys: ServiceFn<
	[
		{
			id: number;
			userId: number | null;
		},
	],
	{
		apiKey: string;
	}
> = async (context, data) => {
	const Integrations = new IntegrationsRepository(context.db);

	const checkExistsRes = await checkIntegrationAccess(context, {
		id: data.id,
		userId: data.userId,
	});
	if (checkExistsRes.error) return checkExistsRes;

	const { apiKey, apiKeyHash, secret } = await generateKeys(
		context.config.secrets.encryption,
	);

	const updateKeysRes = await Integrations.updateSingle({
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
