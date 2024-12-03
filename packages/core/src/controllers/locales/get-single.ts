import T from "../../translations/index.js";
import localeSchema from "../../schemas/locales.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const getSingleController: RouteController<
	typeof localeSchema.getSingle.params,
	typeof localeSchema.getSingle.body,
	typeof localeSchema.getSingle.query
> = async (request, reply) => {
	const localeRes = await serviceWrapper(
		request.server.services.locale.getSingle,
		{
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_locale_fetch_error_name"),
				message: T("route_locale_fetch_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			code: request.params.code,
		},
	);
	if (localeRes.error) throw new LucidAPIError(localeRes.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: localeRes.data,
		}),
	);
};

export default {
	controller: getSingleController,
	zodSchema: localeSchema.getSingle,
};
