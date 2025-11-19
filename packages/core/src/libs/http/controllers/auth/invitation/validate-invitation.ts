import z from "zod/v4";
import T from "../../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../../schemas/auth.js";
import { describeRoute } from "hono-openapi";
import { authServices } from "../../../../../services/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
} from "../../../../../utils/open-api/index.js";
import validate from "../../../middleware/validate.js";

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
		validateResponse: true,
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
