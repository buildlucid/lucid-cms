import z from "zod/v4";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import validate from "../../middleware/validate.js";
import { controllerSchemas } from "../../../../schemas/account.js";
import { describeRoute } from "hono-openapi";
import { accountServices } from "../../../../services/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
} from "../../../../utils/open-api/index.js";
import validateCSRF from "../../middleware/validate-csrf.js";

const factory = createFactory();

const sendResetPasswordController = factory.createHandlers(
	describeRoute({
		description:
			"Sends an email to the given email address informing them to reset their password.",
		tags: ["account"],
		summary: "Send Password Reset",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.sendResetPassword.response),
		}),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoOpenAPIRequestBody(
			controllerSchemas.sendResetPassword.body,
		),
		validateResponse: true,
	}),
	validateCSRF,
	validate("json", controllerSchemas.sendResetPassword.body),
	async (c) => {
		const { email } = c.req.valid("json");

		const resetPassword = await serviceWrapper(
			accountServices.sendResetPassword,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_send_password_reset_error_name"),
					message: T("route_send_password_reset_error_message"),
				},
			},
		)(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				email: email,
			},
		);

		if (resetPassword.error) throw new LucidAPIError(resetPassword.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: resetPassword.data,
			}),
		);
	},
);

export default sendResetPasswordController;
