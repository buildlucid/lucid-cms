import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod/v4";
import { controllerSchemas } from "../../../../schemas/permissions.js";
import { honoOpenAPIResponse } from "../../../../utils/open-api/index.js";
import Formatter from "../../../formatters/index.js";
import { PermissionGroups } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import formatAPIResponse from "../../utils/build-response.js";

const factory = createFactory();

const getAllController = factory.createHandlers(
	describeRoute({
		description: "Returns a list of all permissions available for users.",
		tags: ["permissions"],
		summary: "Get All Permissions",
		responses: honoOpenAPIResponse({
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
					permissions: PermissionGroups,
				}),
			}),
		);
	},
);

export default getAllController;
