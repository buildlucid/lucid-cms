import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/roles.js";
import { roleServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const updateSingleController = factory.createHandlers(
	describeRoute({
		description:
			"Update a single role with the given name and permission groups by ID.",
		tags: ["roles"],
		summary: "Update Role",
		responses: openAPI.responses({
			noProperties: true,
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.updateSingle.params,
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.updateSingle.body),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.RolesUpdate]),
	validate("param", controllerSchemas.updateSingle.params),
	validate("json", controllerSchemas.updateSingle.body),
	async (c) => {
		const { id } = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);
		const auth = c.get("auth");

		const updateRole = await serviceWrapper(roleServices.updateSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.roles.update.error.name"),
				message: copy("server:core.routes.roles.update.error.message"),
			},
		})(context, {
			id: Number.parseInt(id, 10),
			name: body.name,
			description: body.description,
			permissions: body.permissions,
			tenantKey: body.tenantKey,
			authSuperAdmin: auth.superAdmin,
		});
		if (updateRole.error) throw new LucidAPIError(updateRole.error);

		const role = await serviceWrapper(roleServices.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.roles.fetch.error.name"),
				message: copy("server:core.routes.roles.fetch.error.message"),
			},
		})(context, {
			id: Number.parseInt(id, 10),
		});
		if (role.error) throw new LucidAPIError(role.error);

		c.status(204);
		return c.body(null);
	},
);

export default updateSingleController;
