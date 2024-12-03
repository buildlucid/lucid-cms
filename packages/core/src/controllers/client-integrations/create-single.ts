import T from "../../translations/index.js";
import clientIntegrationsSchema from "../../schemas/client-integrations.js";
import { swaggerResponse, swaggerHeaders } from "../../utils/swagger/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import ClientIntegrationsFormatter from "../../libs/formatters/client-integrations.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const createSingleController: RouteController<
	typeof clientIntegrationsSchema.createSingle.params,
	typeof clientIntegrationsSchema.createSingle.body,
	typeof clientIntegrationsSchema.createSingle.query
> = async (request, reply) => {
	const clientIntegrationRes = await serviceWrapper(
		request.server.services.clientIntegrations.createSingle,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_client_integrations_create_error_name"),
				message: T("route_client_integrations_create_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			name: request.body.name,
			description: request.body.description,
		},
	);
	if (clientIntegrationRes.error)
		throw new LucidAPIError(clientIntegrationRes.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: clientIntegrationRes.data,
		}),
	);
};

export default {
	controller: createSingleController,
	zodSchema: clientIntegrationsSchema.createSingle,
	swaggerSchema: {
		description: "Create a single client integration.",
		tags: ["client-integrations"],
		summary: "Create a single client integration",
		response: {
			200: swaggerResponse({
				type: 200,
				data: ClientIntegrationsFormatter.swagger,
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
			},
			required: ["name"],
		},
		headers: swaggerHeaders({
			csrf: true,
		}),
	},
};
