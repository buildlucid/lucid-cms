import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import constants from "../../../../../constants/constants.js";
import { controllerSchemas } from "../../../../../schemas/auth.js";
import { authServices } from "../../../../../services/index.js";
import T from "../../../../../translations/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import rateLimiter from "../../../middleware/rate-limiter.js";
import validate from "../../../middleware/validate.js";
import formatAPIResponse from "../../../utils/build-response.js";

const factory = createFactory();

const validateInvitationController = factory.createHandlers(
	describeRoute({
		description:
			"Validate an invitation token and retrieve user information if valid.",
		tags: ["auth"],
		summary: "Validate Invitation Token",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.validateInvitation.response),
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.validateInvitation.params,
		}),
	}),
	rateLimiter({
		mode: "ip",
		limit: 60,
		scope: "auth:validate-invitation",
		windowMs: constants.timeInMilliseconds["1-minute"],
	}),
	validate("param", controllerSchemas.validateInvitation.params),
	async (c) => {
		const { token } = c.req.valid("param");

		const validateRes = await serviceWrapper(
			authServices.invitation.validateInvitation,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: T("default_error_name"),
					message: T("default_error_message"),
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
				token,
			},
		);
		if (validateRes.error) throw new LucidAPIError(validateRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: validateRes.data,
			}),
		);
	},
);

export default validateInvitationController;
