import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import validate from "../../middleware/validate.js";
import { controllerSchemas } from "../../../../schemas/account.js";
import { describeRoute } from "hono-openapi";
import { userTokenServices } from "../../../../services/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
} from "../../../../utils/open-api/index.js";
import constants from "../../../../constants/constants.js";

const factory = createFactory();

const verifyResetPasswordController = factory.createHandlers(
	describeRoute({
		description: "Verifies the password reset token is valid.",
		tags: ["account"],
		summary: "Verify Reset Token",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.verifyResetPassword.params,
		}),
		validateResponse: true,
	}),
	validate("param", controllerSchemas.verifyResetPassword.params),
	async (c) => {
		const { token } = c.req.valid("param");

		const tokenResult = await serviceWrapper(userTokenServices.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_verify_password_reset_error_name"),
				message: T("route_verify_password_reset_error_message"),
			},
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				tokenType: constants.userTokens.passwordReset,
				token: token,
			},
		);

		if (tokenResult.error) throw new LucidAPIError(tokenResult.error);

		c.status(204);
		return c.body(null);
	},
);

export default verifyResetPasswordController;
