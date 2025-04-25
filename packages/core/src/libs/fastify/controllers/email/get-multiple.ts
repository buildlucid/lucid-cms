import z from "zod";
import T from "../../../../translations/index.js";
import { swaggerResponse } from "../../../../utils/swagger/index.js";
import { controllerSchemas } from "../../../../schemas/email.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const getMultipleController: RouteController<
	typeof controllerSchemas.getMultiple.params,
	typeof controllerSchemas.getMultiple.body,
	typeof controllerSchemas.getMultiple.query.string,
	typeof controllerSchemas.getMultiple.query.formatted
> = async (request, reply) => {
	const emails = await serviceWrapper(
		request.server.services.email.getMultiple,
		{
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_email_fetch_error_name"),
				message: T("route_email_fetch_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			query: request.formattedQuery,
		},
	);
	if (emails.error) throw new LucidAPIError(emails.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: emails.data.data,
			pagination: {
				count: emails.data.count,
				page: request.formattedQuery.page,
				perPage: request.formattedQuery.perPage,
			},
		}),
	);
};

export default {
	controller: getMultipleController,
	zodSchema: controllerSchemas.getMultiple,
	swaggerSchema: {
		description: "Returns multiple emails based on the query parameters.",
		tags: ["emails"],
		summary: "Get Multiple Emails",

		querystring: z.toJSONSchema(controllerSchemas.getMultiple.query.string),
		response: swaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.getMultiple.response),
			paginated: true,
		}),
	},
};
