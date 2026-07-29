import type { OAuthPrincipalType } from "../../libs/db/types.js";
import { oauthConnectionsFormatter } from "../../libs/formatters/index.js";
import { OAuthGrantsRepository } from "../../libs/repositories/index.js";
import type { OAuthConnection } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Lists active OAuth connections for a principal. */
const getConnections: ServiceFn<
	[
		{
			principalType: OAuthPrincipalType;
			userId?: number;
		},
	],
	OAuthConnection[]
> = async (context, input) => {
	const Grants = new OAuthGrantsRepository(
		context.db.client,
		context.config.db,
	);
	const grantsRes = await Grants.selectMultipleWithScopes({
		principalType: input.principalType,
		userId: input.userId,
		validation: { enabled: true },
	});
	if (grantsRes.error) return grantsRes;

	return {
		error: undefined,
		data: oauthConnectionsFormatter.formatMultiple(grantsRes.data),
	};
};

export default getConnections;
