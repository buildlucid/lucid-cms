import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/media.js";
import {
	swaggerResponse,
	swaggerHeaders,
} from "../../../../utils/swagger/index.js";
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
	const media = await serviceWrapper(
		request.server.services.media.getMultiple,
		{
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_media_fetch_error_name"),
				message: T("route_media_fetch_error_message"),
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
			localeCode: request.locale.code,
		},
	);
	if (media.error) throw new LucidAPIError(media.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: media.data.data,
			pagination: {
				count: media.data.count,
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
		description: "Get a multiple media items.",
		tags: ["media"],
		summary: "Get Multiple Media",

		headers: swaggerHeaders({
			contentLocale: true,
		}),
		querystring: z.toJSONSchema(controllerSchemas.getMultiple.query.string),
		response: swaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.getMultiple.response),
			paginated: true,
		}),
	},
};
