import T from "../../translations/index.js";
import usersSchema from "../../schemas/users.js";
import {
	swaggerResponse,
	swaggerQueryString,
} from "../../utils/swagger/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import UsersFormatter from "../../libs/formatters/users.js";
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
	swaggerSchema: {
		description: "Get multiple users.",
		tags: ["users"],
		summary: "Get multiple users.",
		response: {
			200: swaggerResponse({
				type: 200,
				data: {
					type: "array",
					items: UsersFormatter.swagger,
				},
				paginated: true,
			}),
		},
		querystring: swaggerQueryString({
			filters: [
				{
					key: "firstName",
				},
				{
					key: "lastName",
				},
				{
					key: "email",
				},
				{
					key: "username",
				},
				{
					key: "roleIds",
				},
			],
			sorts: [
				"createdAt",
				"updatedAt",
				"firstName",
				"lastName",
				"email",
				"username",
			],
			page: true,
			perPage: true,
		}),
	},
};
