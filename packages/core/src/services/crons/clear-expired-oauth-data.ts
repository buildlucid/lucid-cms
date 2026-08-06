import {
	OAuthAuthorizationCodesRepository,
	OAuthAuthorizationRequestsRepository,
	OAuthRefreshTokensRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Deletes expired OAuth protocol data that is no longer needed for replay checks. */
const clearExpiredOAuthData: ServiceFn<[], undefined> = async (context) => {
	const now = new Date().toISOString();
	const Requests = new OAuthAuthorizationRequestsRepository(context.db);
	const Codes = new OAuthAuthorizationCodesRepository(context.db);
	const RefreshTokens = new OAuthRefreshTokensRepository(context.db);

	const requestsRes = await Requests.deleteMultiple({
		where: [{ key: "expires_at", operator: "<", value: now }],
	});
	if (requestsRes.error) return requestsRes;

	const codesRes = await Codes.deleteMultiple({
		where: [{ key: "expires_at", operator: "<", value: now }],
	});
	if (codesRes.error) return codesRes;

	const refreshTokensRes = await RefreshTokens.deleteMultiple({
		where: [{ key: "expires_at", operator: "<", value: now }],
	});
	if (refreshTokensRes.error) return refreshTokensRes;

	return { error: undefined, data: undefined };
};

export default clearExpiredOAuthData;
