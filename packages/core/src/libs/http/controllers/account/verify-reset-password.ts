import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import constants from "../../../../constants/constants.js";
import { controllerSchemas } from "../../../../schemas/account.js";
import { userTokenServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import validate from "../../middleware/validate.js";
import createServiceContext from "../../utils/create-service-context.js";

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
	}),
	validate("param", controllerSchemas.verifyResetPassword.params),
	async (c) => {
		const { token } = c.req.valid("param");
		const context = createServiceContext(c);

		const tokenResult = await serviceWrapper(userTokenServices.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.verify.password.reset.error.name"),
				message: copy("server:core.routes.verify.password.reset.error.message"),
			},
		})(context, {
			tokenType: constants.userTokens.passwordReset,
			token: token,
		});

		if (tokenResult.error) throw new LucidAPIError(tokenResult.error);

		c.status(204);
		return c.body(null);
	},
);

export default verifyResetPasswordController;
