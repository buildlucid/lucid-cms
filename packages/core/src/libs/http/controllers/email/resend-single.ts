import z from "zod/v4";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/email.js";
import { describeRoute } from "hono-openapi";
import { emailServices } from "../../../../services/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
} from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import permissions from "../../middleware/permissions.js";
import { Permissions } from "../../../permission/definitions.js";

const factory = createFactory();

const resendSingleController = factory.createHandlers(
	describeRoute({
		description: "Resends the email with the given ID.",
		tags: ["emails"],
		summary: "Resend Email",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.resendSingle.response),
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.resendSingle.params,
			headers: {
				csrf: true,
			},
		}),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.SendEmail]),
	validate("param", controllerSchemas.resendSingle.params),
	async (c) => {
		const { id } = c.req.valid("param");

		const emailRes = await serviceWrapper(emailServices.resendSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_email_resend_error_name"),
				message: T("route_email_resend_error_message"),
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
				id: Number.parseInt(id, 10),
			},
		);
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
