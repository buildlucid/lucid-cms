import {
	OAuthGrantsRepository,
	OAuthRefreshTokensRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Revokes an OAuth connection and all refresh tokens issued for it. */
const revokeConnection: ServiceFn<[{ id: number }], undefined> = async (
	context,
	input,
) => {
	const now = new Date().toISOString();
	const Grants = new OAuthGrantsRepository(context.db);
	const updateRes = await Grants.updateSingle({
		data: {
			revoked_at: now,
			updated_at: now,
		},
		where: [
			{ key: "id", operator: "=", value: input.id },
			{ key: "revoked_at", operator: "is", value: null },
		],
	});
	if (updateRes.error) return updateRes;

	const RefreshTokens = new OAuthRefreshTokensRepository(context.db);
	const revokeRes = await RefreshTokens.revokeGrant({
		grantId: input.id,
		revokedAt: now,
	});
	if (revokeRes.error) return revokeRes;

	return { error: undefined, data: undefined };
};

export default revokeConnection;
