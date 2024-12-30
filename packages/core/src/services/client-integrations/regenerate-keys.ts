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
	const ClientIntegrationsRepo = Repository.get(
		"client-integrations",
		context.db,
		context.config.db,
	);

	const checkExists = await ClientIntegrationsRepo.selectSingle({
		select: ["id"],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
	});
	if (checkExists === undefined) {
		return {
			error: {
				type: "basic",
				message: T("client_integration_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const { apiKey, apiKeyHash, secret } = await generateKeys(
		context.config.keys.encryptionKey,
	);

	const updateKeysRes = await ClientIntegrationsRepo.updateSingle({
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
		data: {
			apiKey: apiKeyHash,
			secret: secret,
			updatedAt: new Date().toISOString(),
		},
	});
	if (updateKeysRes === undefined) {
		return {
			error: {
				type: "basic",
				status: 500,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			apiKey: apiKey,
		},
	};
};

export default regenerateKeys;
