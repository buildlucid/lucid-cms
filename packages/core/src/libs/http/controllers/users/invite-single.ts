import z from "zod/v4";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/users.js";
import { describeRoute } from "hono-openapi";
import services from "../../../../services/index.js";
import formatAPIResponse from "../../utils/build-response.js";
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

const factory = createFactory();

const inviteSingleController = factory.createHandlers(
	describeRoute({
		description: "Invite a single user.",
		tags: ["users"],
		summary: "Invite User",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.createSingle.response),
		}),
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
	permissions(["create_user"]),
	validate("json", controllerSchemas.createSingle.body),
	async (c) => {
		const body = c.req.valid("json");
		const auth = c.get("auth");

		const userId = await serviceWrapper(services.user.inviteSingle, {
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
				services: services,
				queue: c.get("queue"),
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

		const user = await serviceWrapper(services.user.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_user_fetch_error_name"),
				message: T("route_user_fetch_error_message"),
			},
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				services: services,
				queue: c.get("queue"),
			},
			{
				userId: userId.data,
			},
		);
		if (user.error) throw new LucidAPIError(user.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: user.data,
			}),
		);
	},
);

export default inviteSingleController;
