import permissionsSchema from "../../schemas/permissions.js";
import formatAPIResponse from "../../utils/build-response.js";
import permissionGroups from "../../constants/permission-groups.js";
import Formatter from "../../libs/formatters/index.js";
import type { RouteController } from "../../types/types.js";

const getAllController: RouteController<
	typeof permissionsSchema.getAll.params,
	typeof permissionsSchema.getAll.body,
	typeof permissionsSchema.getAll.query
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
	zodSchema: permissionsSchema.getAll,
};
