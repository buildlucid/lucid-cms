import z from "zod";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/permissions.js";
import { describeRoute } from "hono-openapi";
import formatAPIResponse from "../../utils/build-response.js";
import permissionGroups from "../../../../constants/permission-groups.js";
import Formatter from "../../../formatters/index.js";
import { honoSwaggerResponse } from "../../../../utils/swagger/index.js";
import authenticate from "../../middleware/authenticate.js";

const factory = createFactory();

const getAllController = factory.createHandlers(
	describeRoute({
		description: "Returns a list of all permissions available for users.",
		tags: ["permissions"],
		summary: "Get All Permissions",
		responses: honoSwaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.getAll.response),
		}),
		validateResponse: true,
	}),
	authenticate,
	async (c) => {
		const PermissionsFormatter = Formatter.get("permissions");

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: PermissionsFormatter.formatMultiple({
					permissions: permissionGroups,
				}),
			}),
		);
	},
);

export default getAllController;
