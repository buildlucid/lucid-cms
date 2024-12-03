import T from "../../translations/index.js";
import clientIntegrationsSchema from "../../schemas/client-integrations.js";
import { swaggerResponse, swaggerHeaders } from "../../utils/swagger/index.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const deleteSingleController: RouteController<
	typeof clientIntegrationsSchema.deleteSingle.params,
	typeof clientIntegrationsSchema.deleteSingle.body,
	typeof clientIntegrationsSchema.deleteSingle.query
> = async (request, reply) => {
	const deleteSingleRes = await serviceWrapper(
		request.server.services.clientIntegrations.deleteSingle,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_client_integrations_delete_error_name"),
				message: T("route_client_integrations_delete_error_message"),
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
	if (deleteSingleRes.error) throw new LucidAPIError(deleteSingleRes.error);

	reply.status(204).send();
};

export default {
	controller: deleteSingleController,
	zodSchema: clientIntegrationsSchema.deleteSingle,
	swaggerSchema: {
		description: "Delete a single client integration.",
		tags: ["client-integrations"],
		summary: "Delete a single client integration",
		response: {
			204: swaggerResponse({
				type: 204,
				noPropertise: true,
			}),
		},
		headers: swaggerHeaders({
			csrf: true,
		}),
	},
};
