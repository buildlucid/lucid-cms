import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/roles.js";
import { headers, response } from "../../../../utils/swagger/index.js";
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
	const roleId = await serviceWrapper(
		request.server.services.role.createSingle,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_roles_create_error_name"),
				message: T("route_roles_create_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			name: request.body.name,
			description: request.body.description,
			permissions: request.body.permissions,
		},
	);
	if (roleId.error) throw new LucidAPIError(roleId.error);

	const role = await serviceWrapper(request.server.services.role.getSingle, {
		transaction: false,
		defaultError: {
			type: "basic",
			name: T("route_roles_fetch_error_name"),
			message: T("route_roles_fetch_error_message"),
		},
	})(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			id: roleId.data,
		},
	);
	if (role.error) throw new LucidAPIError(role.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: role.data,
		}),
	);
};

export default {
	controller: createSingleController,
	zodSchema: controllerSchemas.createSingle,
	swaggerSchema: {
		description:
			"Create a single role with the given name and permission groups.",
		tags: ["roles"],
		summary: "Create Role",

		headers: headers({
			csrf: true,
		}),
		// querystring: z.toJSONSchema(controllerSchemas.createSingle.query.string),
		body: z.toJSONSchema(controllerSchemas.createSingle.body),
		// params: z.toJSONSchema(controllerSchemas.createSingle.params),
		response: response({
			schema: z.toJSONSchema(controllerSchemas.createSingle.response),
		}),
	},
};
