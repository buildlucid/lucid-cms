import { ClientIntegrationsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const updateLastUsed: ServiceFn<
	[
		{
			id: number;
			ipAddress: string | null;
			userAgent: string | null;
		},
	],
	undefined
> = async (context, data) => {
	const ClientIntegrations = new ClientIntegrationsRepository(
		context.db.client,
		context.config.db,
	);

	const updateRes = await ClientIntegrations.updateMultiple({
		data: {
			last_used_at: new Date().toISOString(),
			last_used_ip: data.ipAddress,
			last_used_user_agent: data.userAgent,
		},
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
	});
	if (updateRes.error) return updateRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateLastUsed;
