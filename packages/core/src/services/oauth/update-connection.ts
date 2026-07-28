import { oauthConnectionsFormatter } from "../../libs/formatters/index.js";
import { OAuthGrantsRepository } from "../../libs/repositories/index.js";
import type { OAuthConnection } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Updates and returns an active OAuth connection. */
const updateConnection: ServiceFn<
	[
		{
			id: number;
			name: string;
		},
	],
	OAuthConnection
> = async (context, input) => {
	const Grants = new OAuthGrantsRepository(
		context.db.client,
		context.config.db,
	);
	const updateRes = await Grants.updateSingle({
		data: {
			name: input.name.trim(),
			updated_at: new Date().toISOString(),
		},
		where: [{ key: "id", operator: "=", value: input.id }],
	});
	if (updateRes.error) return updateRes;

	const grantRes = await Grants.selectSingleWithScopes({
		id: input.id,
		validation: { enabled: true },
	});
	if (grantRes.error) return grantRes;

	return {
		error: undefined,
		data: oauthConnectionsFormatter.formatSingle(grantRes.data),
	};
};

export default updateConnection;
