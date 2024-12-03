import T from "../../translations/index.js";
import clientIntegrationsSchema from "../../schemas/client-integrations.js";
import { swaggerResponse, swaggerHeaders } from "../../utils/swagger/index.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import ClientIntegrationsFormatter from "../../libs/formatters/client-integrations.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import type { RouteController } from "../../types/types.js";

const regenerateKeysController: RouteController<
	typeof clientIntegrationsSchema.regenerateKeys.params,
	typeof clientIntegrationsSchema.regenerateKeys.body,
	typeof clientIntegrationsSchema.regenerateKeys.query
> = async (request, reply) => {
	const regenerateKeysRes = await serviceWrapper(
		request.server.services.clientIntegrations.regenerateKeys,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_client_integrations_update_error_name"),
				message: T("route_client_integrations_update_error_message"),
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
	if (regenerateKeysRes.error) throw new LucidAPIError(regenerateKeysRes.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: regenerateKeysRes.data,
		}),
	);
};

export default {
	controller: regenerateKeysController,
	zodSchema: clientIntegrationsSchema.regenerateKeys,
	swaggerSchema: {
		description: "Regenerates the API key for the given client integration.",
		tags: ["client-integrations"],
		summary: "Regenerate a single client integration API key.",
		response: {
			200: swaggerResponse({
				type: 200,
				data: ClientIntegrationsFormatter.swagger,
			}),
		},
		headers: swaggerHeaders({
			csrf: true,
		}),
	},
};
