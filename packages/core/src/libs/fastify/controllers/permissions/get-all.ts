import z from "zod";
import { controllerSchemas } from "../../../../schemas/permissions.js";
import { swaggerResponse } from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import permissionGroups from "../../../../constants/permission-groups.js";
import Formatter from "../../../formatters/index.js";
import type { RouteController } from "../../../../types/types.js";

const getAllController: RouteController<
	typeof controllerSchemas.getAll.params,
	typeof controllerSchemas.getAll.body,
	typeof controllerSchemas.getAll.query.string,
	typeof controllerSchemas.getAll.query.formatted
> = async (request, reply) => {
	const PermissionsFormatter = Formatter.get("permissions");

	reply.status(200).send(
		formatAPIResponse(request, {
			data: PermissionsFormatter.formatMultiple({
				permissions: permissionGroups,
			}),
		}),
	);
};

export default {
	controller: getAllController,
	zodSchema: controllerSchemas.getAll,
	swaggerSchema: {
		description: "Returns a list of all permissions available for users.",
		tags: ["permissions"],
		summary: "Get All Permissions",

		response: swaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.getAll.response),
		}),
	},
};
