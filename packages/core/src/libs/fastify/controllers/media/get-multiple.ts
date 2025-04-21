import z from "zod";
import T from "../../../../translations/index.js";
import mediaSchema from "../../../../schemas/media.js";
import { response, headers } from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const getMultipleController: RouteController<
	typeof mediaSchema.getMultiple.params,
	typeof mediaSchema.getMultiple.body,
	typeof mediaSchema.getMultiple.query.string,
	typeof mediaSchema.getMultiple.query.formatted
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
	zodSchema: mediaSchema.getMultiple,
	swaggerSchema: {
		description: "Get a multiple media items.",
		tags: ["media"],
		summary: "Get a multiple media items.",
		headers: headers({
			contentLocale: true,
		}),

		querystring: z.toJSONSchema(mediaSchema.getMultiple.query.string),
		// body: z.toJSONSchema(mediaSchema.getMultiple.body),
		// params: z.toJSONSchema(mediaSchema.getMultiple.params),
		response: response({
			schema: {
				type: "array",
				items: z.toJSONSchema(mediaSchema.getMultiple.response),
			},
			paginated: true,
		}),
	},
};
