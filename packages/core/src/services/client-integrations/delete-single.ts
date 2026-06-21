import cacheKeys from "../../libs/kv/cache-keys.js";
import { ClientIntegrationsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkIntegrationAccess from "./checks/check-integration-access.js";

const deleteSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	undefined
> = async (context, data) => {
	const ClientIntegrations = new ClientIntegrationsRepository(
		context.db.client,
		context.config.db,
	);

	const checkExistsRes = await checkIntegrationAccess(context, {
		id: data.id,
	});
	if (checkExistsRes.error) return checkExistsRes;

	const deleteRes = await ClientIntegrations.deleteSingle({
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (deleteRes.error) return deleteRes;

	const cacheKey = cacheKeys.auth.client(checkExistsRes.data.key);
	await context.kv.delete(context, { key: cacheKey, hash: true });

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSingle;
