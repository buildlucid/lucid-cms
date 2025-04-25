import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/users.js";
import {
	swaggerHeaders,
	swaggerResponse,
} from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const createSingleController: RouteController<
	typeof controllerSchemas.createSingle.params,
	typeof controllerSchemas.createSingle.body,
	typeof controllerSchemas.createSingle.query.string,
	typeof controllerSchemas.createSingle.query.formatted
> = async (request, reply) => {
	const userId = await serviceWrapper(
		request.server.services.user.createSingle,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_user_create_error_name"),
				message: T("route_user_create_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			email: request.body.email,
			username: request.body.username,
			roleIds: request.body.roleIds,
			firstName: request.body.firstName,
			lastName: request.body.lastName,
			superAdmin: request.body.superAdmin,
			authSuperAdmin: request.auth.superAdmin,
		},
	);
	if (userId.error) throw new LucidAPIError(userId.error);

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
			userId: userId.data,
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
	controller: createSingleController,
	zodSchema: controllerSchemas.createSingle,
	swaggerSchema: {
		description: "Create a single user.",
		tags: ["users"],
		summary: "Create User",

		headers: swaggerHeaders({
			csrf: true,
		}),
		body: z.toJSONSchema(controllerSchemas.createSingle.body),
		response: swaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.createSingle.response),
		}),
	},
};
