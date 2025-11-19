import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/users.js";
import { describeRoute } from "hono-openapi";
import { userServices } from "../../../../services/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
} from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import permissions from "../../middleware/permissions.js";
import { Permissions } from "../../../permission/definitions.js";

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
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.CreateUser]),
	validate("json", controllerSchemas.createSingle.body),
	async (c) => {
		const body = c.req.valid("json");
		const auth = c.get("auth");

		const userId = await serviceWrapper(userServices.inviteSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_user_create_error_name"),
				message: T("route_user_create_error_message"),
			},
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				email: body.email,
				username: body.username,
				roleIds: body.roleIds,
				firstName: body.firstName,
				lastName: body.lastName,
				superAdmin: body.superAdmin,
				authSuperAdmin: auth.superAdmin,
			},
		);
		if (userId.error) throw new LucidAPIError(userId.error);

		c.status(201);
		return c.body(null);
	},
);

export default inviteSingleController;
