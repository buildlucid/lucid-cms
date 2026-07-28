import { sign } from "hono/jwt";
import constants from "../../constants/constants.js";
import type { OAuthPrincipalType } from "../../libs/db/types.js";
import { OAuthRefreshTokensRepository } from "../../libs/repositories/index.js";
import type {
	OAuthAccessTokenClaims,
	OAuthTokenResponse,
} from "../../schemas/oauth.js";
import type { ServiceFn } from "../../utils/services/types.js";
import {
	createOAuthOpaqueToken,
	getOAuthSigningKey,
	hashOAuthRefreshToken,
} from "./helpers/security.js";
import { getOAuthUrls } from "./helpers/urls.js";

type TokenGrant = {
	id: number;
	client_id: string;
	principal_type: OAuthPrincipalType;
	user_id: number | null;
	tenant_key: string | null;
	scopes: Array<{ scope: string }>;
};

/**
 * Issues an access token and persists its rotating refresh token.
 */
const issueOAuthTokens: ServiceFn<
	[
		{
			grant: TokenGrant;
			resource: string;
			familyId?: string;
		},
	],
	OAuthTokenResponse
> = async (context, input) => {
	const nowSeconds = Math.floor(Date.now() / 1000);
	const refreshToken = createOAuthOpaqueToken();
	const familyId = input.familyId ?? createOAuthOpaqueToken();
	const scope = input.grant.scopes.map((entry) => entry.scope).join(" ");
	const urls = getOAuthUrls(context);

	const claims: OAuthAccessTokenClaims = {
		iss: urls.issuer,
		sub:
			input.grant.principal_type === "user"
				? `user:${input.grant.user_id}`
				: `system:${input.grant.id}`,
		aud: input.resource,
		exp: nowSeconds + constants.oauth.accessTokenExpirationSeconds,
		iat: nowSeconds,
		jti: createOAuthOpaqueToken(),
		grant_id: input.grant.id,
		client_id: input.grant.client_id,
		principal_type: input.grant.principal_type,
		user_id: input.grant.user_id,
		tenant_key: input.grant.tenant_key,
		scope,
	};
	const accessToken = await sign(
		claims,
		getOAuthSigningKey(context),
		constants.jwt.algorithm,
	);

	const RefreshTokens = new OAuthRefreshTokensRepository(
		context.db.client,
		context.config.db,
	);
	const refreshRes = await RefreshTokens.createSingle({
		data: {
			token_hash: hashOAuthRefreshToken(context, refreshToken),
			family_id: familyId,
			grant_id: input.grant.id,
			client_id: input.grant.client_id,
			resource: input.resource,
			expires_at: new Date(
				Date.now() + constants.oauth.refreshTokenExpirationSeconds * 1000,
			).toISOString(),
			created_at: new Date().toISOString(),
		},
	});
	if (refreshRes.error) return refreshRes;

	return {
		error: undefined,
		data: {
			access_token: accessToken,
			token_type: "Bearer",
			expires_in: constants.oauth.accessTokenExpirationSeconds,
			refresh_token: refreshToken,
			scope,
		},
	};
};

export default issueOAuthTokens;
