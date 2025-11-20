import cacheKeys from "../../libs/kv-adapter/cache-keys.js";
import { ClientIntegrationsRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const deleteSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	undefined
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
	await context.kv.command.delete(cacheKey);

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSingle;
