import { OAuthRefreshTokensRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { hashOAuthRefreshToken } from "./helpers/security.js";

/** Revokes the rotation family for a submitted OAuth refresh token. */
const revokeToken: ServiceFn<
	[
		{
			token: string;
			clientId: string;
		},
	],
	undefined
> = async (context, input) => {
	const RefreshTokens = new OAuthRefreshTokensRepository(
		context.db.client,
		context.config.db,
	);
	const tokenRes = await RefreshTokens.selectSingle({
		select: ["family_id", "client_id"],
		where: [
			{
				key: "token_hash",
				operator: "=",
				value: hashOAuthRefreshToken(context, input.token),
			},
		],
	});
	if (tokenRes.error) return tokenRes;
	if (!tokenRes.data || tokenRes.data.client_id !== input.clientId) {
		return { error: undefined, data: undefined };
	}

	const revokeRes = await RefreshTokens.revokeFamily({
		familyId: tokenRes.data.family_id,
		revokedAt: new Date().toISOString(),
	});
	if (revokeRes.error) return revokeRes;

	return { error: undefined, data: undefined };
};

export default revokeToken;
