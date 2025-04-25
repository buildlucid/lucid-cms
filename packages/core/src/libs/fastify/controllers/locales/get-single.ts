import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/locales.js";
import { response } from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const getSingleController: RouteController<
	typeof controllerSchemas.getSingle.params,
	typeof controllerSchemas.getSingle.body,
	typeof controllerSchemas.getSingle.query.string,
	typeof controllerSchemas.getSingle.query.formatted
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
	zodSchema: controllerSchemas.getSingle,
	swaggerSchema: {
		description: "Returns a single locale based on the given code.",
		tags: ["locales"],
		summary: "Get Locale",

		// headers: headers({
		// 	csrf: true,
		// }),
		// querystring: z.toJSONSchema(controllerSchemas.getSingle.query.string),
		// body: z.toJSONSchema(controllerSchemas.getSingle.body),
		params: z.toJSONSchema(controllerSchemas.getSingle.params),
		response: response({
			schema: z.toJSONSchema(controllerSchemas.getSingle.response),
		}),
	},
};
