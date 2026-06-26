import { minutesToMilliseconds } from "date-fns";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import constants from "../../../../constants/constants.js";
import { controllerSchemas } from "../../../../schemas/email.js";
import { emailServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import rateLimiter from "../../middleware/rate-limiter.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const resendSingleController = factory.createHandlers(
	describeRoute({
		description: "Resends the email with the given ID.",
		tags: ["emails"],
		summary: "Resend Email",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.resendSingle.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.resendSingle.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate(),
	rateLimiter({
		mode: "user",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: minutesToMilliseconds(1),
	}),
	permissions([Permissions.EmailSend]),
	validate("param", controllerSchemas.resendSingle.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = createServiceContext(c);

		const emailRes = await serviceWrapper(emailServices.resendSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.email.resend.error.name"),
				message: copy("server:core.routes.email.resend.error.message"),
			},
		})(context, {
			id: Number.parseInt(id, 10),
		});
		if (emailRes.error) throw new LucidAPIError(emailRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: emailRes.data,
			}),
		);
	},
);

export default resendSingleController;
