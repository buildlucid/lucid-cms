import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/roles.js";
import { roleServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const deleteSingleController = factory.createHandlers(
	describeRoute({
		description: "Delete a single role based on the given role ID.",
		tags: ["roles"],
		summary: "Delete Role",

		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.deleteSingle.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.DeleteRole]),
	validate("param", controllerSchemas.deleteSingle.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = getServiceContext(c);

		const deleteSingle = await serviceWrapper(roleServices.deleteSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_roles_delete_error_name"),
				message: T("route_roles_delete_error_message"),
			},
		})(context, {
			id: Number.parseInt(id, 10),
		});
		if (deleteSingle.error) throw new LucidAPIError(deleteSingle.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteSingleController;
