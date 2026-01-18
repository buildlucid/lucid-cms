import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/client-integrations.js";
import { clientIntegrationServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import formatAPIResponse from "../../utils/build-response.js";

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
	validate("param", controllerSchemas.getSingle.params),
	async (c) => {
		const { id } = c.req.valid("param");

		const getSingleRes = await serviceWrapper(
			clientIntegrationServices.getSingle,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: T("route_client_integrations_fetch_error_name"),
					message: T("route_client_integrations_fetch_error_message"),
				},
			},
		)(
			{
				db: c.get("config").db,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				id: Number.parseInt(id, 10),
			},
		);
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
