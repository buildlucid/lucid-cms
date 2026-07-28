import { OAuthGrantsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Records the latest request details for an OAuth connection. */
const updateLastUsed: ServiceFn<
	[
		{
			id: number;
			ipAddress: string | null;
			userAgent: string | null;
		},
	],
	undefined
> = async (context, input) => {
	const Grants = new OAuthGrantsRepository(
		context.db.client,
		context.config.db,
	);
	const updateRes = await Grants.updateSingle({
		data: {
			last_used_at: new Date().toISOString(),
			last_used_ip: input.ipAddress,
			last_used_user_agent: input.userAgent,
		},
		where: [{ key: "id", operator: "=", value: input.id }],
	});
	if (updateRes.error) return updateRes;

	return { error: undefined, data: undefined };
};

export default updateLastUsed;
