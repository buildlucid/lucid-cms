import {
	OAuthAuthorizationCodesRepository,
	OAuthGrantsRepository,
} from "../../libs/repositories/index.js";
import type { OAuthTokenResponse } from "../../schemas/oauth.js";
import type { ServiceFn, ServiceResponse } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import { hashOAuthAuthorizationCode, verifyPkce } from "./helpers/security.js";
import issueOAuthTokens from "./issue-tokens.js";
import revokeConnection from "./revoke-connection.js";

/**
 * Exchanges an authorization code transactionally. Run without an outer transaction so code-reuse
 * revocation survives the rejected exchange (RFC 6749 4.1.2).
 */
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
	if (!codeRes.data) {
		return {
			error: {
				type: "authorisation",
				code: "invalid_grant",
				status: 400,
			},
			data: undefined,
		};
	}

	const grantId = codeRes.data.grant_id;
	const revokeGrant = async (): ServiceResponse<OAuthTokenResponse> => {
		const revokeRes = await withTransaction(context, (context) =>
			revokeConnection(context, { id: grantId }),
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

	if (codeRes.data.consumed_at !== null) return revokeGrant();
	if (
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

	//* set when another request used the code first, which counts as using it twice
	let reused = false;
	const issueRes = await withTransaction(context, async (context) => {
		const Codes = new OAuthAuthorizationCodesRepository(context.db);
		const consumeRes = await Codes.consume({
			codeHash,
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
			resource: input.resource,
		});
	});
	if (reused) return revokeGrant();

	return issueRes;
};

export default exchangeAuthorizationCode;
