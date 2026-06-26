import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/account.js";
import { accountServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const resetPasswordController = factory.createHandlers(
	describeRoute({
		description: "Resets the password for the authenticated user.",
		tags: ["account"],
		summary: "Reset Password",
		responses: openAPI.responses(),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
			params: controllerSchemas.resetPassword.params,
		}),
		requestBody: openAPI.requestBody(controllerSchemas.resetPassword.body),
	}),
	validateCSRF,
	validate("param", controllerSchemas.resetPassword.params),
	validate("json", controllerSchemas.resetPassword.body),
	async (c) => {
		const { token } = c.req.valid("param");
		const { password } = c.req.valid("json");
		const context = createServiceContext(c);

		const resetPassword = await serviceWrapper(accountServices.resetPassword, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.reset.password.error.name"),
				message: copy("server:core.routes.reset.password.error.message"),
			},
		})(context, {
			token: token,
			password: password,
		});

		if (resetPassword.error) throw new LucidAPIError(resetPassword.error);

		c.status(204);
		return c.body(null);
	},
);

export default resetPasswordController;
