import constants from "../../../constants/constants.js";
import {
	AuthStatesRepository,
	UsersRepository,
	UserTokensRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { invalidateAuthCache } from "../helpers/auth-cache.js";

/**
 * Ends all of a user's sessions: revokes their refresh tokens, stops their access tokens at once
 * and drops pending provider links, so ended sessions cannot finish linking.
 */
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
	const UserTokens = new UserTokensRepository(context.db);
	const AuthStates = new AuthStatesRepository(context.db);
	const Users = new UsersRepository(context.db);
	const now = new Date().toISOString();

	const deleteStatesRes = await AuthStates.deleteMultiple({
		where: [
			{
				key: "authenticated_user_id",
				operator: "=",
				value: data.userId,
			},
		],
	});
	if (deleteStatesRes.error) return deleteStatesRes;

	//* access tokens carry the version they were issued at, so they stop now rather than when they expire
	const versionRes = await Users.incrementSessionVersion({ id: data.userId });
	if (versionRes.error) return versionRes;
	await invalidateAuthCache(context);

	const activeTokenRes = await UserTokens.selectMultiple({
		select: ["id"],
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

	return {
		error: undefined,
		data: {
			revokedCount: activeTokenRes.data.length,
		},
	};
};

export default revokeUserTokens;
