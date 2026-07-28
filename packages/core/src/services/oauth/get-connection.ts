import { oauthConnectionsFormatter } from "../../libs/formatters/index.js";
import { OAuthGrantsRepository } from "../../libs/repositories/index.js";
import type { OAuthConnection } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Loads and formats a single active OAuth connection. */
const getConnection: ServiceFn<[{ id: number }], OAuthConnection> = async (
	context,
	input,
) => {
	const Grants = new OAuthGrantsRepository(
		context.db.client,
		context.config.db,
	);
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

export default getConnection;
