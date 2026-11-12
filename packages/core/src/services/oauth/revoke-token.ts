import { verify } from "hono/jwt";
import constants from "../../constants/constants.js";
import { OAuthRefreshTokensRepository } from "../../libs/repositories/index.js";
import { oauthAccessTokenClaimsSchema } from "../../schemas/oauth.js";
import type { ServiceFn } from "../../utils/services/types.js";
import {
	getOAuthSigningKey,
	hashOAuthRefreshToken,
} from "./helpers/security.js";
import revokeConnection from "./revoke-connection.js";

/**
 * Revokes the client's connection and all its tokens (RFC 7009). Ignores unknown, expired and
 * other clients' tokens.
 */
const revokeToken: ServiceFn<
	[
		{
			token: string;
			clientId: string;
		},
	],
	undefined
> = async (context, input) => {
	let grantId: number | undefined;

	//* access tokens are signed JWTs, refresh tokens opaque
	if (input.token.includes(".")) {
		try {
			const claims = oauthAccessTokenClaimsSchema.safeParse(
				await verify(
					input.token,
					getOAuthSigningKey(context),
					constants.jwt.algorithm,
				),
			);
			if (claims.success && claims.data.client_id === input.clientId) {
				grantId = claims.data.grant_id;
			}
		} catch {
			//* an expired or forged access token has nothing left to revoke
		}
	} else {
		const RefreshTokens = new OAuthRefreshTokensRepository(context.db);
		const tokenRes = await RefreshTokens.selectSingle({
			select: ["grant_id", "client_id"],
			where: [
				{
					key: "token_hash",
					operator: "=",
					value: hashOAuthRefreshToken(context, input.token),
				},
			],
		});
		if (tokenRes.error) return tokenRes;
		if (tokenRes.data?.client_id === input.clientId) {
			grantId = tokenRes.data.grant_id;
		}
	}

	if (grantId === undefined) return { error: undefined, data: undefined };
	return revokeConnection(context, { id: grantId });
};

export default revokeToken;
