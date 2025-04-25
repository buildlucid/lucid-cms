import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/account.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import { swaggerResponse } from "../../../../utils/swagger/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const getMeController: RouteController<
	typeof controllerSchemas.getMe.params,
	typeof controllerSchemas.getMe.body,
	typeof controllerSchemas.getMe.query.string,
	typeof controllerSchemas.getMe.query.formatted
> = async (request, reply) => {
	const user = await serviceWrapper(request.server.services.user.getSingle, {
		transaction: false,
		defaultError: {
			type: "basic",
			name: T("route_user_fetch_error_name"),
			message: T("route_user_fetch_error_message"),
		},
	})(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			userId: request.auth.id,
		},
	);
	if (user.error) throw new LucidAPIError(user.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: user.data,
		}),
	);
};

export default {
	controller: getMeController,
	zodSchema: controllerSchemas.getMe,
	swaggerSchema: {
		description: "Returns the authenticated user based on the access token.",
		tags: ["account"],
		summary: "Get Authenticated User",

		response: swaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.getMe.response),
		}),
	},
};
