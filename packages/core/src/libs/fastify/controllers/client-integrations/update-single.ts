import T from "../../../../translations/index.js";
import clientIntegrationsSchema from "../../../../schemas/client-integrations.js";
import {
	swaggerResponse,
	swaggerHeaders,
	response,
	headers,
} from "../../../../utils/swagger/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";
import z from "zod";

const updateSingleController: RouteController<
	typeof clientIntegrationsSchema.updateSingle.params,
	typeof clientIntegrationsSchema.updateSingle.body,
	typeof clientIntegrationsSchema.updateSingle.query.string,
	typeof clientIntegrationsSchema.updateSingle.query.formatted
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
		summary: "Update Client Integration",

		headers: headers({
			csrf: true,
		}),
		// querystring: z.toJSONSchema(clientIntegrationsSchema.updateSingle.query.string),
		body: z.toJSONSchema(clientIntegrationsSchema.updateSingle.body),
		params: z.toJSONSchema(clientIntegrationsSchema.updateSingle.params),
		response: response({
			noProperties: true,
		}),
	},
};
