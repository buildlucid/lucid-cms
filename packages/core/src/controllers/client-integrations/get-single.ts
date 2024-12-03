import T from "../../translations/index.js";
import clientIntegrationsSchema from "../../schemas/client-integrations.js";
import { swaggerResponse } from "../../utils/swagger/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import ClientIntegrationsFormatter from "../../libs/formatters/client-integrations.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const getSingleController: RouteController<
	typeof clientIntegrationsSchema.getSingle.params,
	typeof clientIntegrationsSchema.getSingle.body,
	typeof clientIntegrationsSchema.getSingle.query
> = async (request, reply) => {
	const getSingleRes = await serviceWrapper(
		request.server.services.clientIntegrations.getSingle,
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
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			id: Number.parseInt(request.params.id),
		},
	);
	if (getSingleRes.error) throw new LucidAPIError(getSingleRes.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: getSingleRes.data,
		}),
	);
};

export default {
	controller: getSingleController,
	zodSchema: clientIntegrationsSchema.getSingle,
	swaggerSchema: {
		description: "Get a single client integration",
		tags: ["client-integrations"],
		summary: "Get a single client integration",
		response: {
			200: swaggerResponse({
				type: 200,
				data: ClientIntegrationsFormatter.swagger,
			}),
		},
	},
};
