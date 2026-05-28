import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/roles.js";
import { roleServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { serverText } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const createSingleController = factory.createHandlers(
	describeRoute({
		description:
			"Create a single role with the given name and permission groups.",
		tags: ["roles"],
		summary: "Create Role",

		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.createSingle.response),
		}),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.createSingle.body),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.RolesCreate]),
	validate("json", controllerSchemas.createSingle.body),
	async (c) => {
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const roleId = await serviceWrapper(roleServices.createSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: serverText("core.routes.roles.create.error.name"),
				message: serverText("core.routes.roles.create.error.message"),
			},
		})(context, {
			name: body.name,
			description: body.description,
			permissions: body.permissions,
		});
		if (roleId.error) throw new LucidAPIError(roleId.error);

		const role = await serviceWrapper(roleServices.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: serverText("core.routes.roles.fetch.error.name"),
				message: serverText("core.routes.roles.fetch.error.message"),
			},
		})(context, {
			id: roleId.data,
		});
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
