import {
	OAuthAuthorizationCodesRepository,
	OAuthGrantsRepository,
} from "../../libs/repositories/index.js";
import type { OAuthTokenResponse } from "../../schemas/oauth.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { hashOAuthAuthorizationCode, verifyPkce } from "./helpers/security.js";
import issueOAuthTokens from "./issue-tokens.js";

/** Exchanges a valid authorization code for OAuth access and refresh tokens. */
const exchangeAuthorizationCode: ServiceFn<
	[
		{
			code: string;
			clientId: string;
			redirectUri: string;
			resource: string;
			codeVerifier: string;
		},
	],
	OAuthTokenResponse
> = async (context, input) => {
	const Codes = new OAuthAuthorizationCodesRepository(context.db);
	const codeHash = hashOAuthAuthorizationCode(context, input.code);
	const codeRes = await Codes.selectSingle({
		select: [
			"id",
			"grant_id",
			"client_id",
			"redirect_uri",
			"resource",
			"code_challenge",
			"expires_at",
			"consumed_at",
		],
		where: [{ key: "code_hash", operator: "=", value: codeHash }],
	});
	if (codeRes.error) return codeRes;
	if (
		!codeRes.data ||
		codeRes.data.consumed_at !== null ||
		new Date(codeRes.data.expires_at).getTime() <= Date.now() ||
		codeRes.data.client_id !== input.clientId ||
		codeRes.data.redirect_uri !== input.redirectUri ||
		codeRes.data.resource !== input.resource ||
		!verifyPkce(input.codeVerifier, codeRes.data.code_challenge)
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

	const consumedAt = new Date().toISOString();
	const consumeRes = await Codes.consume({
		codeHash,
		consumedAt,
	});
	if (consumeRes.error) return consumeRes;
	if (!consumeRes.data) {
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
		resource: input.resource,
	});
};

export default exchangeAuthorizationCode;
