import constants from "../../../constants/constants.js";
import cacheKeys from "../../../libs/kv-adapter/cache-keys.js";
import { UserTokensRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const revokeUserTokens: ServiceFn<
	[
		{
			userId: number;
			revokeReason?: string;
		},
	],
	{
		revokedCount: number;
	}
> = async (context, data) => {
	const UserTokens = new UserTokensRepository(
		context.db.client,
		context.config.db,
	);
	const now = new Date().toISOString();

	const activeTokenRes = await UserTokens.selectMultiple({
		select: ["id", "token"],
		where: [
			{
				key: "user_id",
				operator: "=",
				value: data.userId,
			},
			{
				key: "token_type",
				operator: "=",
				value: constants.userTokens.refresh,
			},
			{
				key: "revoked_at",
				operator: "is",
				value: null,
			},
			{
				key: "expiry_date",
				operator: ">",
				value: now,
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (activeTokenRes.error) return activeTokenRes;

	if (activeTokenRes.data.length === 0) {
		return {
			error: undefined,
			data: {
				revokedCount: 0,
			},
		};
	}

	const tokenIds = activeTokenRes.data.map((token) => token.id);

	const revokeTokensRes = await UserTokens.updateMultiple({
		data: {
			revoked_at: now,
			revoke_reason:
				data.revokeReason ?? constants.refreshTokenRevokeReasons.revokeAll,
			expiry_date: now,
		},
		where: [
			{
				key: "id",
				operator: "in",
				value: tokenIds,
			},
		],
	});
	if (revokeTokensRes.error) return revokeTokensRes;

	await Promise.all(
		activeTokenRes.data.map((token) =>
			context.kv.delete(cacheKeys.auth.refresh(token.token), { hash: true }),
		),
	);

	return {
		error: undefined,
		data: {
			revokedCount: activeTokenRes.data.length,
		},
	};
};

export default revokeUserTokens;
