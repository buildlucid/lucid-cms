import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/client-integrations.js";
import { swaggerResponse } from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const getAllController: RouteController<
	typeof controllerSchemas.getAll.params,
	typeof controllerSchemas.getAll.body,
	typeof controllerSchemas.getAll.query.string,
	typeof controllerSchemas.getAll.query.formatted
> = async (request, reply) => {
	const getAllRes = await serviceWrapper(
		request.server.services.clientIntegrations.getAll,
		{
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_client_integrations_fetch_error_name"),
				message: T("route_client_integrations_fetch_error_message"),
			},
		},
	)({
		db: request.server.config.db.client,
		config: request.server.config,
		services: request.server.services,
	});
	if (getAllRes.error) throw new LucidAPIError(getAllRes.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: getAllRes.data,
		}),
	);
};

export default {
	controller: getAllController,
	zodSchema: controllerSchemas.getAll,
	swaggerSchema: {
		description: "Returns all client integrations.",
		tags: ["client-integrations"],
		summary: "Get All Client Integrations",

		response: swaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.getAll.response),
		}),
	},
};
