import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import constants from "../../../../constants/constants.js";
import { accountServices, authServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const revokeRefreshTokensController = factory.createHandlers(
	describeRoute({
		description:
			"Revoke all refresh tokens for the authenticated user and clear the current auth session.",
		tags: ["account"],
		summary: "Revoke All Authenticated User Refresh Tokens",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate,
	async (c) => {
		const context = getServiceContext(c);
		const auth = c.get("auth");

		const revokeAllRes = await serviceWrapper(
			accountServices.revokeAllRefreshTokens,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: T("route_user_me_update_error_name"),
					message: T("route_user_me_update_error_message"),
				},
			},
		)(context, {
			userId: auth.id,
		});
		if (revokeAllRes.error) throw new LucidAPIError(revokeAllRes.error);

		const [refreshRes, accessRes, csrfRes] = await Promise.all([
			authServices.refreshToken.clearToken(c, {
				revokeReason: constants.refreshTokenRevokeReasons.accountRevokeAll,
			}),
			authServices.accessToken.clearToken(c),
			authServices.csrf.clearToken(c),
		]);
		if (refreshRes.error) throw new LucidAPIError(refreshRes.error);
		if (accessRes.error) throw new LucidAPIError(accessRes.error);
		if (csrfRes.error) throw new LucidAPIError(csrfRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default revokeRefreshTokensController;
