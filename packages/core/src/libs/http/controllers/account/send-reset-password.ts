import { minutesToMilliseconds } from "date-fns";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import constants from "../../../../constants/constants.js";
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
import rateLimiter from "../../middleware/rate-limiter.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import formatAPIResponse from "../../utils/build-response.js";
import getServiceContext from "../../utils/get-service-context.js";

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
	}),
	validateCSRF,
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: minutesToMilliseconds(1),
	}),
	validate("json", controllerSchemas.sendResetPassword.body),
	async (c) => {
		const { email } = c.req.valid("json");
		const context = getServiceContext(c);

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
		)(context, {
			email: email,
		});

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
