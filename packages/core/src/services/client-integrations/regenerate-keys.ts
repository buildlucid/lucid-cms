import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
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
	const ClientIntegrations = Repository.get(
		"client-integrations",
		context.db,
		context.config.db,
	);

	const checkExistsRes = await ClientIntegrations.selectSingle({
		select: ["id"],
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

	return {
		error: undefined,
		data: {
			apiKey: apiKey,
		},
	};
};

export default regenerateKeys;
