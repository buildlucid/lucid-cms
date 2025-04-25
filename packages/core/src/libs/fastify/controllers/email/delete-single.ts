import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/email.js";
import {
	swaggerHeaders,
	swaggerResponse,
} from "../../../../utils/swagger/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const deleteSingleController: RouteController<
	typeof controllerSchemas.deleteSingle.params,
	typeof controllerSchemas.deleteSingle.body,
	typeof controllerSchemas.deleteSingle.query.string,
	typeof controllerSchemas.deleteSingle.query.formatted
> = async (request, reply) => {
	const deleteSingle = await serviceWrapper(
		request.server.services.email.deleteSingle,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_email_delete_error_name"),
				message: T("route_email_delete_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			id: Number.parseInt(request.params.id, 10),
		},
	);
	if (deleteSingle.error) throw new LucidAPIError(deleteSingle.error);

	reply.status(204).send();
};

export default {
	controller: deleteSingleController,
	zodSchema: controllerSchemas.deleteSingle,
	swaggerSchema: {
		description: "Deletes a single email based on the the id.",
		tags: ["emails"],
		summary: "Delete Email",

		headers: swaggerHeaders({
			csrf: true,
		}),
		params: z.toJSONSchema(controllerSchemas.deleteSingle.params),
		response: swaggerResponse({
			noProperties: true,
		}),
	},
};
