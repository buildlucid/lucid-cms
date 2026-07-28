import { verify } from "hono/jwt";
import constants from "../../constants/constants.js";
import { OAuthGrantsRepository } from "../../libs/repositories/index.js";
import { oauthAccessTokenClaimsSchema } from "../../schemas/oauth.js";
import type { LucidOAuthExternalAuth } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { getOAuthSigningKey } from "./helpers/security.js";
import { getOAuthUrls } from "./helpers/urls.js";
import resolveGrantAuthority from "./resolve-grant-authority.js";

/** Verifies an OAuth access token and resolves its effective authority. */
const verifyAccessToken: ServiceFn<
	[{ accessToken: string }],
	LucidOAuthExternalAuth
> = async (context, input) => {
	let payload: Awaited<ReturnType<typeof verify>>;
	try {
		payload = await verify(
			input.accessToken,
			getOAuthSigningKey(context),
			constants.jwt.algorithm,
		);
	} catch {
		return {
			error: {
				type: "authorisation",
				code: "invalid_token",
				status: 401,
			},
			data: undefined,
		};
	}

	const parsedClaims = oauthAccessTokenClaimsSchema.safeParse(payload);
	if (!parsedClaims.success) {
		return {
			error: {
				type: "authorisation",
				code: "invalid_token",
				status: 401,
			},
			data: undefined,
		};
	}
	const claims = parsedClaims.data;
	const urls = getOAuthUrls(context);
	if (claims.iss !== urls.issuer || claims.aud !== urls.resource) {
		return {
			error: {
				type: "authorisation",
				code: "invalid_token",
				status: 401,
			},
			data: undefined,
		};
	}

	const Grants = new OAuthGrantsRepository(
		context.db.client,
		context.config.db,
	);
	const grantRes = await Grants.selectSingleWithScopes({
		id: claims.grant_id,
		validation: {
			enabled: true,
			defaultError: {
				type: "authorisation",
				status: 401,
			},
		},
	});
	if (grantRes.error) return grantRes;

	const expectedSubject =
		grantRes.data.principal_type === "user"
			? `user:${grantRes.data.user_id}`
			: `system:${grantRes.data.id}`;
	if (
		claims.sub !== expectedSubject ||
		grantRes.data.client_id !== claims.client_id ||
		grantRes.data.principal_type !== claims.principal_type ||
		grantRes.data.user_id !== claims.user_id ||
		grantRes.data.tenant_key !== claims.tenant_key
	) {
		return {
			error: {
				type: "authorisation",
				code: "invalid_token",
				status: 401,
			},
			data: undefined,
		};
	}

	return resolveGrantAuthority(context, grantRes.data);
};

export default verifyAccessToken;
