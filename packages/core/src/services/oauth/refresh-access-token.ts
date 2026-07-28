import {
	OAuthGrantsRepository,
	OAuthRefreshTokensRepository,
} from "../../libs/repositories/index.js";
import type { OAuthTokenResponse } from "../../schemas/oauth.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { hashOAuthRefreshToken } from "./helpers/security.js";
import issueOAuthTokens from "./issue-tokens.js";

/** Rotates a valid refresh token and issues a new OAuth token pair. */
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
	const RefreshTokens = new OAuthRefreshTokensRepository(
		context.db.client,
		context.config.db,
	);
	const tokenHash = hashOAuthRefreshToken(context, input.refreshToken);
	const tokenRes = await RefreshTokens.selectSingle({
		select: [
			"id",
			"family_id",
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

	const now = new Date().toISOString();
	if (
		tokenRes.data.consumed_at !== null ||
		tokenRes.data.revoked_at !== null ||
		new Date(tokenRes.data.expires_at).getTime() <= Date.now()
	) {
		const revokeRes = await RefreshTokens.revokeFamily({
			familyId: tokenRes.data.family_id,
			revokedAt: now,
		});
		if (revokeRes.error) return revokeRes;
		return {
			error: {
				type: "authorisation",
				code: "invalid_grant",
				status: 400,
			},
			data: undefined,
		};
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

	const consumeRes = await RefreshTokens.consume({
		tokenHash,
		consumedAt: now,
	});
	if (consumeRes.error) return consumeRes;
	if (!consumeRes.data) {
		const revokeRes = await RefreshTokens.revokeFamily({
			familyId: tokenRes.data.family_id,
			revokedAt: now,
		});
		if (revokeRes.error) return revokeRes;
		return {
			error: {
				type: "authorisation",
				code: "invalid_grant",
				status: 400,
			},
			data: undefined,
		};
	}

	const Grants = new OAuthGrantsRepository(
		context.db.client,
		context.config.db,
	);
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
		resource: tokenRes.data.resource,
		familyId: consumeRes.data.family_id,
	});
};

export default refreshAccessToken;
