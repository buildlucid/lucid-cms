import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/email.js";
import { emailServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import formatAPIResponse from "../../utils/build-response.js";
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const getSingleController = factory.createHandlers(
	describeRoute({
		description: "Returns a single email based on the the ID.",
		tags: ["emails"],
		summary: "Get Email",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getSingle.response),
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.getSingle.params,
		}),
	}),
	authenticate,
	permissions([Permissions.ReadEmail]),
	validate("param", controllerSchemas.getSingle.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = getServiceContext(c);

		const email = await serviceWrapper(emailServices.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_email_fetch_error_name"),
				message: T("route_email_fetch_error_message"),
			},
		})(context, {
			id: Number.parseInt(id, 10),
			renderTemplate: true,
		});
		if (email.error) throw new LucidAPIError(email.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: email.data,
			}),
		);
	},
);

export default getSingleController;
