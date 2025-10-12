import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/users.js";
import { describeRoute } from "hono-openapi";
import services from "../../../../services/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIRequestBody,
	honoOpenAPIParamaters,
} from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import permissions from "../../middleware/permissions.js";

const factory = createFactory();

const restoreMultipleController = factory.createHandlers(
	describeRoute({
		description: "Restore multiple users by IDs.",
		tags: ["users"],
		summary: "Restore Multiple Users",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.restoreMultiple.body),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions(["update_user"]),
	validate("json", controllerSchemas.restoreMultiple.body),
	async (c) => {
		const { ids } = c.req.valid("json");

		const restoreRes = await serviceWrapper(services.users.restoreMultiple, {
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
				ids,
			},
		);
		if (restoreRes.error) throw new LucidAPIError(restoreRes.error);

		c.status(201);
		return c.body(null);
	},
);

export default restoreMultipleController;
