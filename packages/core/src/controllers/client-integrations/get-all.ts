import T from "../../translations/index.js";
import clientIntegrationsSchema from "../../schemas/client-integrations.js";
import { swaggerResponse } from "../../utils/swagger/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import ClientIntegrationsFormatter from "../../libs/formatters/client-integrations.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const getAllController: RouteController<
	typeof clientIntegrationsSchema.getAll.params,
	typeof clientIntegrationsSchema.getAll.body,
	typeof clientIntegrationsSchema.getAll.query
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
	zodSchema: clientIntegrationsSchema.getAll,
	swaggerSchema: {
		description: "Get all client integrations.",
		tags: ["client-integrations"],
		summary: "Get all client integrations",
		response: {
			200: swaggerResponse({
				type: 200,
				data: {
					type: "array",
					items: ClientIntegrationsFormatter.swagger,
				},
			}),
		},
	},
};
