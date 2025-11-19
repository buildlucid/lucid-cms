import z from "zod/v4";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/client-integrations.js";
import { describeRoute } from "hono-openapi";
import { clientIntegrationServices } from "../../../../services/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import { honoOpenAPIResponse } from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";

const factory = createFactory();

const getAllController = factory.createHandlers(
	describeRoute({
		description: "Returns all client integrations.",
		tags: ["client-integrations"],
		summary: "Get All Client Integrations",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getAll.response),
		}),
		validateResponse: true,
	}),
	authenticate,
	async (c) => {
		const getAllRes = await serviceWrapper(clientIntegrationServices.getAll, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_client_integrations_fetch_error_name"),
				message: T("route_client_integrations_fetch_error_message"),
			},
		})({
			db: c.get("config").db.client,
			config: c.get("config"),
			queue: c.get("queue"),
			env: c.get("env"),
			kv: c.get("kv"),
		});
		if (getAllRes.error) throw new LucidAPIError(getAllRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: getAllRes.data,
			}),
		);
	},
);

export default getAllController;
