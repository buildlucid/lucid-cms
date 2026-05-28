import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/client-integrations.js";
import { clientIntegrationServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { serverText } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getSingleController = factory.createHandlers(
	describeRoute({
		description: "Get a single client integration by ID.",
		tags: ["client-integrations"],
		summary: "Get Client Integration",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getSingle.response),
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.getSingle.params,
		}),
	}),
	authenticate,
	permissions([Permissions.IntegrationRead]),
	validate("param", controllerSchemas.getSingle.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = createServiceContext(c);

		const getSingleRes = await serviceWrapper(
			clientIntegrationServices.getSingle,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: serverText("core.routes.client.integrations.fetch.error.name"),
					message: serverText(
						"core.routes.client.integrations.fetch.error.message",
					),
				},
			},
		)(context, {
			id: Number.parseInt(id, 10),
		});
		if (getSingleRes.error) throw new LucidAPIError(getSingleRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: getSingleRes.data,
			}),
		);
	},
);

export default getSingleController;
