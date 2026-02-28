import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/users.js";
import { userServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const revokeRefreshTokensController = factory.createHandlers(
	describeRoute({
		description: "Revoke all refresh tokens for a specific user.",
		tags: ["users"],
		summary: "Revoke User Refresh Tokens",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.revokeRefreshTokens.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.UsersUpdate]),
	validate("param", controllerSchemas.revokeRefreshTokens.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = getServiceContext(c);

		const revokeRes = await serviceWrapper(userServices.revokeRefreshTokens, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_user_update_error_name"),
				message: T("route_user_update_error_message"),
			},
		})(context, {
			userId: Number.parseInt(id, 10),
		});
		if (revokeRes.error) throw new LucidAPIError(revokeRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default revokeRefreshTokensController;
