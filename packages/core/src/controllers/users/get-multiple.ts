import T from "../../translations/index.js";
import usersSchema from "../../schemas/users.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const getMultipleController: RouteController<
	typeof usersSchema.getMultiple.params,
	typeof usersSchema.getMultiple.body,
	typeof usersSchema.getMultiple.query
> = async (request, reply) => {
	const users = await serviceWrapper(request.server.services.user.getMultiple, {
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
			query: request.query,
		},
	);
	if (users.error) throw new LucidAPIError(users.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: users.data.data,
			pagination: {
				count: users.data.count,
				page: request.query.page,
				perPage: request.query.perPage,
			},
		}),
	);
};

export default {
	controller: getMultipleController,
	zodSchema: usersSchema.getMultiple,
};
