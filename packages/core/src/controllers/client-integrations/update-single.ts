import T from "../../translations/index.js";
import clientIntegrationsSchema from "../../schemas/client-integrations.js";
import { swaggerResponse, swaggerHeaders } from "../../utils/swagger/index.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const updateSingleController: RouteController<
	typeof clientIntegrationsSchema.updateSingle.params,
	typeof clientIntegrationsSchema.updateSingle.body,
	typeof clientIntegrationsSchema.updateSingle.query
> = async (request, reply) => {
	const updateSingleRes = await serviceWrapper(
		request.server.services.clientIntegrations.updateSingle,
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
			name: request.body.name,
			description: request.body.description,
			enabled: request.body.enabled,
		},
	);
	if (updateSingleRes.error) throw new LucidAPIError(updateSingleRes.error);

	reply.status(204).send();
};

export default {
	controller: updateSingleController,
	zodSchema: clientIntegrationsSchema.updateSingle,
	swaggerSchema: {
		description: "Update a single client integration.",
		tags: ["client-integrations"],
		summary: "Update a single client integration",
		response: {
			204: swaggerResponse({
				type: 204,
				noPropertise: true,
			}),
		},
		body: {
			type: "object",
			properties: {
				name: {
					type: "string",
				},
				description: {
					type: "string",
				},
				enabled: {
					type: "number",
					example: 1,
				},
			},
		},
		headers: swaggerHeaders({
			csrf: true,
		}),
	},
};
