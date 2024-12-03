import T from "../../translations/index.js";
import localeSchema from "../../schemas/locales.js";
import {
	swaggerResponse,
	swaggerQueryString,
} from "../../utils/swagger/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import LocalesFormatter from "../../libs/formatters/locales.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const getAllController: RouteController<
	typeof localeSchema.getAll.params,
	typeof localeSchema.getAll.body,
	typeof localeSchema.getAll.query
> = async (request, reply) => {
	const locales = await serviceWrapper(request.server.services.locale.getAll, {
		transaction: false,
		defaultError: {
			type: "basic",
			name: T("route_locale_fetch_error_name"),
			message: T("route_locale_fetch_error_message"),
		},
	})({
		db: request.server.config.db.client,
		config: request.server.config,
		services: request.server.services,
	});
	if (locales.error) throw new LucidAPIError(locales.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: locales.data,
		}),
	);
};

export default {
	controller: getAllController,
	zodSchema: localeSchema.getAll,
	swaggerSchema: {
		description: "Returns all locale.",
		tags: ["locales"],
		summary: "Get all locales",
		response: {
			200: swaggerResponse({
				type: 200,
				data: {
					type: "array",
					items: LocalesFormatter.swagger,
				},
				paginated: true,
			}),
		},
		querystring: swaggerQueryString({
			sorts: ["code", "createdAt", "updatedAt"],
			page: true,
			perPage: true,
		}),
	},
};
