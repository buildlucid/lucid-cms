import {
	OAuthGrantsRepository,
	OAuthRefreshTokensRepository,
} from "../../libs/repositories/index.js";
import type { OAuthTokenResponse } from "../../schemas/oauth.js";
import type { ServiceFn, ServiceResponse } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import { hashOAuthRefreshToken } from "./helpers/security.js";
import issueOAuthTokens from "./issue-tokens.js";
import revokeConnection from "./revoke-connection.js";

/**
 * Rotates refresh tokens transactionally. Reuse revokes the connection, including concurrent
 * replacements. Run without an outer transaction so revocation survives rejection.
 */
const refreshAccessToken: ServiceFn<
	[
		{
			refreshToken: string;
			clientId: string;
			resource?: string;
		},
	],
	OAuthTokenResponse
> = async (context, input) => {
	const RefreshTokens = new OAuthRefreshTokensRepository(context.db);
	const tokenHash = hashOAuthRefreshToken(context, input.refreshToken);
	const tokenRes = await RefreshTokens.selectSingle({
		select: [
			"id",
			"grant_id",
			"client_id",
			"resource",
			"expires_at",
			"consumed_at",
			"revoked_at",
		],
		where: [{ key: "token_hash", operator: "=", value: tokenHash }],
	});
	if (tokenRes.error) return tokenRes;
	if (!tokenRes.data) {
		return {
			error: {
				type: "authorisation",
				code: "invalid_grant",
				status: 400,
			},
			data: undefined,
		};
	}

	const token = tokenRes.data;
	//* each connection has one token family, so ending the connection also ends the access tokens it issued
	const revokeGrant = async (): ServiceResponse<OAuthTokenResponse> => {
		const revokeRes = await withTransaction(context, (context) =>
			revokeConnection(context, { id: token.grant_id }),
		);
		if (revokeRes.error) return revokeRes;
		return {
			error: {
				type: "authorisation",
				code: "invalid_grant",
				status: 400,
			},
			data: undefined,
		};
	};

	if (
		tokenRes.data.consumed_at !== null ||
		tokenRes.data.revoked_at !== null ||
		new Date(tokenRes.data.expires_at).getTime() <= Date.now()
	) {
		return revokeGrant();
	}
	if (
		tokenRes.data.client_id !== input.clientId ||
		(input.resource !== undefined && tokenRes.data.resource !== input.resource)
	) {
		return {
			error: {
				type: "authorisation",
				code: "invalid_grant",
				status: 400,
			},
			data: undefined,
		};
	}

	//* set when another request used the token first, which counts as reuse
	let reused = false;
	const rotateRes = await withTransaction(context, async (context) => {
		const RefreshTokens = new OAuthRefreshTokensRepository(context.db);
		const consumeRes = await RefreshTokens.consume({
			tokenHash,
			consumedAt: new Date().toISOString(),
		});
		if (consumeRes.error) return consumeRes;
		if (!consumeRes.data) {
			reused = true;
			return {
				error: {
					type: "authorisation",
					code: "invalid_grant",
					status: 400,
				},
				data: undefined,
			};
		}

		const Grants = new OAuthGrantsRepository(context.db);
		const grantRes = await Grants.selectSingleWithScopes({
			id: consumeRes.data.grant_id,
			validation: {
				enabled: true,
				defaultError: {
					type: "authorisation",
					code: "invalid_grant",
					status: 400,
				},
			},
		});
		if (grantRes.error) return grantRes;

		return issueOAuthTokens(context, {
			grant: grantRes.data,
			resource: token.resource,
			familyId: consumeRes.data.family_id,
		});
	});
	if (reused) return revokeGrant();

	return rotateRes;
};

export default refreshAccessToken;
