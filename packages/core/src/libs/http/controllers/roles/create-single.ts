import z from "zod";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/roles.js";
import { describeRoute } from "hono-openapi";
import services from "../../../../services/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoSwaggerResponse,
	honoSwaggerParamaters,
	honoSwaggerRequestBody,
} from "../../../../utils/swagger/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import permissions from "../../middleware/permissions.js";

const factory = createFactory();

const createSingleController = factory.createHandlers(
	describeRoute({
		description:
			"Create a single role with the given name and permission groups.",
		tags: ["roles"],
		summary: "Create Role",

		responses: honoSwaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.createSingle.response),
		}),
		parameters: honoSwaggerParamaters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoSwaggerRequestBody(controllerSchemas.createSingle.body),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions(["create_role"]),
	validate("json", controllerSchemas.createSingle.body),
	async (c) => {
		const body = c.req.valid("json");

		const roleId = await serviceWrapper(services.role.createSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_roles_create_error_name"),
				message: T("route_roles_create_error_message"),
			},
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				services: services,
			},
			{
				name: body.name,
				description: body.description,
				permissions: body.permissions,
			},
		);
		if (roleId.error) throw new LucidAPIError(roleId.error);

		const role = await serviceWrapper(services.role.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_roles_fetch_error_name"),
				message: T("route_roles_fetch_error_message"),
			},
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				services: services,
			},
			{
				id: roleId.data,
			},
		);
		if (role.error) throw new LucidAPIError(role.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: role.data,
			}),
		);
	},
);

export default createSingleController;
