import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/account.js";
import { accountServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";

const factory = createFactory();

const resetPasswordController = factory.createHandlers(
	describeRoute({
		description: "Resets the password for the authenticated user.",
		tags: ["account"],
		summary: "Reset Password",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
			params: controllerSchemas.resetPassword.params,
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.resetPassword.body),
	}),
	validateCSRF,
	validate("param", controllerSchemas.resetPassword.params),
	validate("json", controllerSchemas.resetPassword.body),
	async (c) => {
		const { token } = c.req.valid("param");
		const { password } = c.req.valid("json");

		const resetPassword = await serviceWrapper(accountServices.resetPassword, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_reset_password_error_name"),
				message: T("route_reset_password_error_message"),
			},
		})(
			{
				db: c.get("config").db,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
				requestUrl: c.req.url,
			},
			{
				token: token,
				password: password,
			},
		);

		if (resetPassword.error) throw new LucidAPIError(resetPassword.error);

		c.status(204);
		return c.body(null);
	},
);

export default resetPasswordController;
