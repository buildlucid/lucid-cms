import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/users.js";
import { describeRoute } from "hono-openapi";
import { userServices } from "../../../../services/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
} from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import permissions from "../../middleware/permissions.js";
import { Permissions } from "../../../permission/definitions.js";

const factory = createFactory();

const updateSingleController = factory.createHandlers(
	describeRoute({
		description: "Update a single user.",
		tags: ["users"],
		summary: "Update User",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.updateSingle.params,
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.updateSingle.body),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.UpdateUser]),
	validate("param", controllerSchemas.updateSingle.params),
	validate("json", controllerSchemas.updateSingle.body),
	async (c) => {
		const { id } = c.req.valid("param");
		const body = c.req.valid("json");
		const auth = c.get("auth");

		const updateUser = await serviceWrapper(userServices.updateSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_user_update_error_name"),
				message: T("route_user_update_error_message"),
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
				auth: {
					id: auth.id,
					superAdmin: auth.superAdmin,
				},
				userId: Number.parseInt(id, 10),
				roleIds: body.roleIds,
				superAdmin: body.superAdmin,
				triggerPasswordReset: body.triggerPasswordReset,
				isDeleted: body.isDeleted,
				isLocked: body.isLocked,
			},
		);
		if (updateUser.error) throw new LucidAPIError(updateUser.error);

		c.status(204);
		return c.body(null);
	},
);

export default updateSingleController;
