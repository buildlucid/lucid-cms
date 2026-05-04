import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/permissions.js";
import { honoOpenAPIResponse } from "../../../../utils/open-api/index.js";
import { permissionsFormatter } from "../../../formatters/index.js";
import { getPermissionRegistry } from "../../../permission/registry.js";
import authenticate from "../../middleware/authenticate.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getAllController = factory.createHandlers(
	describeRoute({
		description: "Returns a list of all permissions available for users.",
		tags: ["permissions"],
		summary: "Get All Permissions",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getAll.response),
		}),
	}),
	authenticate,
	async (c) => {
		const context = createServiceContext(c);
		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: permissionsFormatter.formatMultiple({
					permissions: getPermissionRegistry(context.config),
				}),
			}),
		);
	},
);

export default getAllController;
