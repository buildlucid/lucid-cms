import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/users.js";
import { userServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const inviteSingleController = factory.createHandlers(
	describeRoute({
		description: "Invite a single user.",
		tags: ["users"],
		summary: "Invite User",
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.createSingle.body),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.CreateUser]),
	validate("json", controllerSchemas.createSingle.body),
	async (c) => {
		const body = c.req.valid("json");
		const auth = c.get("auth");
		const context = getServiceContext(c);

		const userId = await serviceWrapper(userServices.inviteSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_user_create_error_name"),
				message: T("route_user_create_error_message"),
			},
		})(context, {
			email: body.email,
			username: body.username,
			roleIds: body.roleIds,
			firstName: body.firstName,
			lastName: body.lastName,
			superAdmin: body.superAdmin,
			authSuperAdmin: auth.superAdmin,
		});
		if (userId.error) throw new LucidAPIError(userId.error);

		c.status(201);
		return c.body(null);
	},
);

export default inviteSingleController;
